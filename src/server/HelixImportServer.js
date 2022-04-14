/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { promisify } from 'util';
import EventEmitter from 'events';
import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { PassThrough } from 'stream';
import { fetch } from '../fetch-utils.js';
import utils from './utils.js';
import packageJson from '../package.cjs';
import RequestContext from './RequestContext.js';

const DEFAULT_PORT = 3001;

/**
 * Wraps the route middleware so it can catch potential promise rejections
 * during the async invocation.
 *
 * @param {ExpressMiddleware} fn an extended express middleware function
 * @returns {ExpressMiddleware} an express middleware function.
 */
function asyncHandler(fn) {
  return (req, res, next) => (Promise.resolve(fn(req, res, next)).catch(next));
}

export default class HelixServer extends EventEmitter {
  /**
   * Creates a new HelixServer for the given project.
   * @param {HelixProject} project
   */
  constructor(project) {
    super();
    this._project = project;
    this._app = express();
    this._port = DEFAULT_PORT;
    this._server = null;
  }

  /**
   * Returns the logger.
   * @returns {Logger} the logger.
   */
  get log() {
    return this._project.log;
  }

  /**
   * Proxy Mode route handler
   * @param {Express.Request} req request
   * @param {Express.Response} res response
   */
  async handleToolsRequest(req, res) {
    const sendFile = promisify(res.sendFile).bind(res);
    const ctx = new RequestContext(req, this._project);
    const { log } = this;

    // try to serve static
    try {
      const filePath = path.join(this._project.directory, ctx.path);
      log.debug('trying to serve local file', filePath);
      await sendFile(filePath, {
        dotfiles: 'allow',
        headers: {
          'access-control-allow-origin': '*',
        },
      });
      return;
    } catch (e) {
      // not sure what to do yet here
      // codecov:ignore:start
      /* c8 ignore start */
      log.debug(`Error while delivering resource ${ctx.path} - ${e.stack || e}`);
      // codecov:ignore:end
      /* c8 ignore end */
    }

    res.status(404).send(`Unknwon path: ${ctx.path}`);
  }

  // eslint-disable-next-line class-methods-use-this
  _makeProxyURL(reqUrl, base) {
    const url = new URL(reqUrl, base);
    url.searchParams.delete('host');
    return url.toString();
  }

  async _doProxyRequest(ctx, url, host, req, res) {
    ctx.log.debug(`Proxy ${req.method} request to ${url}`);

    if (this._project.cacheDirectory) {
      const cached = await utils.getFromCache(
        url,
        this._project.cacheDirectory,
        ctx.log,
      );
      if (cached) {
        res
          .status(cached.status)
          .set(cached.headers)
          .send(cached.body);
        return;
      }
    }

    const stream = new PassThrough();
    req.pipe(stream);
    const headers = {
      ...req.headers,
    };
    delete headers.cookie;
    delete headers.connection;
    delete headers.host;

    const ret = await fetch(url, {
      method: req.method,
      headers,
      cache: 'no-store',
      redirect: 'manual',
    });

    const contentType = ret.headers.get('content-type') || 'text/plain';
    const level = utils.status2level(ret.status, true);
    ctx.log[level](`Proxy ${req.method} request to ${url}: ${ret.status} (${contentType})`);

    // because fetch decodes the response, we need to reset content encoding and length
    const respHeaders = ret.headers.plain();
    delete respHeaders['content-encoding'];
    delete respHeaders['content-length'];
    delete respHeaders.location;
    respHeaders['access-control-allow-origin'] = '*';

    let buffer;
    if (this._project.cacheDirectory) {
      buffer = await ret.buffer();
      await utils.writeToCache(
        url,
        this._project.cacheDirectory,
        {
          body: buffer,
          headers: respHeaders,
          status: ret.status,
        },
        ctx.log,
      );
    }

    if (contentType.includes('html') || contentType.includes('text')) {
      // make urls relative
      let text;
      if (buffer) {
        text = buffer.toString();
      } else {
        text = await ret.text();
      }
      text = text.replace(host, '/');
      res
        .status(ret.status)
        .set(respHeaders)
        .send(text);
      ret.body.pipe(res);
      return;
    }

    if (buffer) {
      res
        .status(ret.status)
        .set(respHeaders)
        .send(buffer);
      ret.body.pipe(res);
    } else {
      res
        .status(ret.status)
        .set(respHeaders);
      ret.body.pipe(res);
    }
  }

  /**
   * Proxy Mode route handler
   * @param {Express.Request} req request
   * @param {Express.Response} res response
   */
  async handleProxyModeRequest(req, res) {
    const ctx = new RequestContext(req, this._project);
    const { log } = this;

    let host = ctx.params?.host;
    if (!host) {
      // first call sets the cookie, next calls use the cookie
      host = req.cookies['hlx-proxyhost'];
    }

    if (!host) {
      res.status(403).send('Missing host parameter');
    } else {
      try {
        res.cookie('hlx-proxyhost', host);
        const url = this._makeProxyURL(ctx.url, host);
        await this._doProxyRequest(ctx, url, host, req, res);
      // codecov:ignore:start
      /* c8 ignore start */
      } catch (err) {
        log.error(`Failed to proxy helix request ${ctx.path}: ${err.message}`);
        res.status(502).send(`Failed to proxy helix request: ${err.message}`);
      }
      // codecov:ignore:end
      /* c8 ignore end */
    }

    this.emit('request', req, res, ctx);
  }

  async setupApp() {
    this._app.get('/.kill', (req, res) => {
      res.send('Goodbye!');
      this.stop();
    });

    this._app.get('/tools/*', asyncHandler(this.handleToolsRequest.bind(this)));
    this._app.get('*', asyncHandler(this.handleProxyModeRequest.bind(this)));
  }

  withPort(port) {
    this._port = port;
    return this;
  }

  isStarted() {
    return this._server !== null;
  }

  get port() {
    return this._port;
  }

  async start() {
    const { log } = this;
    if (this._port !== 0) {
      if (this._project.kill && await utils.checkPortInUse(this._port)) {
        await fetch(`http://localhost:${this._port}/.kill`);
      }
      const inUse = await utils.checkPortInUse(this._port);
      if (inUse) {
        throw new Error(`Port ${this._port} already in use by another process.`);
      }
    }
    log.info(`Starting helix import server v${packageJson.version}`);
    await new Promise((resolve, reject) => {
      this._app.use(cookieParser());
      this._server = this._app.listen(this._port, (err) => {
        /* c8 ignore start */
        // codecov:ignore:start
        if (err) {
          reject(new Error(`Error while starting http server: ${err}`));
        }
        // codecov:ignore:end
        /* c8 ignore end */
        this._port = this._server.address().port;
        log.info(`Local Helix Dev server up and running: http://localhost:${this._port}/`);
        resolve();
      });
    });

    await this.setupApp();
  }

  async stop() {
    const { log } = this;
    if (!this._server) {
      log.warn('server not started.');
      return true;
    }
    return new Promise((resolve, reject) => {
      this._server.close((err) => {
        /* c8 ignore start */
        // codecov:ignore:start
        if (err) {
          reject(new Error(`Error while stopping http server: ${err}`));
        }
        // codecov:ignore:end
        /* c8 ignore end */
        log.info('Local Helix Dev server stopped.');
        this._server = null;
        resolve();
      });
    });
  }
}
