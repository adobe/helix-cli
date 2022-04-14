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
import { fetch } from '../fetch-utils.js';
import utils from './utils.js';
import packageJson from '../package.cjs';
import RequestContext from './RequestContext.js';

const DEFAULT_PORT = 3000;

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
  async handleProxyModeRequest(req, res) {
    const sendFile = promisify(res.sendFile).bind(res);
    const ctx = new RequestContext(req, this._project);
    const { log } = this;
    const { proxyUrl } = this._project;

    const { liveReload } = ctx.config;
    if (liveReload) {
      liveReload.startRequest(ctx.requestId, ctx.path);
    }

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
      if (liveReload) {
        liveReload.registerFile(ctx.requestId, filePath);
      }
      return;
    } catch (e) {
      log.debug(`Error while delivering resource ${ctx.path} - ${e.stack || e}`);
    } finally {
      if (liveReload) {
        liveReload.endRequest(ctx.requestId);
      }
    }

    // use proxy
    try {
      const url = utils.makeProxyURL(ctx.url, proxyUrl);
      await utils.proxyRequest(ctx, url, req, res, {
        injectLiveReload: this._project.liveReload,
        headHtml: this._project.headHtml,
        indexer: this._project.indexer,
        cacheDirectory: this._project.cacheDirectory,
      });
    } catch (err) {
      log.error(`Failed to proxy helix request ${ctx.path}: ${err.message}`);
      res.status(502).send(`Failed to proxy helix request: ${err.message}`);
    }

    this.emit('request', req, res, ctx);
  }

  async setupApp() {
    const handler = asyncHandler(this.handleProxyModeRequest.bind(this));
    this._app.get('/.kill', (req, res) => {
      res.send('Goodbye!');
      this.stop();
    });
    this._app.get('*', handler);
    this._app.post('*', handler);
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
    log.info(`Starting helix-simulator v${packageJson.version}`);
    await new Promise((resolve, reject) => {
      this._server = this._app.listen(this._port, (err) => {
        if (err) {
          reject(new Error(`Error while starting http server: ${err}`));
        }
        this._port = this._server.address().port;
        log.info(`Local Helix Dev server up and running: http://localhost:${this._port}/`);
        if (this._project.proxyUrl) {
          log.info(`Enabled reverse proxy to ${this._project.proxyUrl}`);
        }
        resolve();
      });
    });
    await this._project.initLiveReload(this._app, this._server);
    await this._project.initHeadHtml();
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
        if (err) {
          reject(new Error(`Error while stopping http server: ${err}`));
        }
        log.info('Local Helix Dev server stopped.');
        this._server = null;
        resolve();
      });
    });
  }
}
