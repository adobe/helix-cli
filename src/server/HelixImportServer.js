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
import path from 'path';
import { PassThrough } from 'stream';
import { getFetch, resetContext } from '../fetch-utils.js';
import utils from './utils.js';
import RequestContext from './RequestContext.js';
import { asyncHandler, BaseServer } from './BaseServer.js';

export class HelixImportServer extends BaseServer {
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
      if (path.relative(this._project.directory, filePath).startsWith('..')) {
        log.info(`refuse to serve file outside the project directory: ${filePath}`);
        res.status(403).send('');
        return;
      }
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

    res.status(404).send(`Unknown path: ${ctx.path}`);
  }

  // eslint-disable-next-line class-methods-use-this
  _makeProxyURL(reqUrl, base) {
    const url = new URL(reqUrl, base);
    url.searchParams.delete('host');
    return url.toString();
  }

  async _updateHeaders(headers) {
    // merge the headers defined with the CLI with those from the request
    Object.assign(headers, await this._project.cliHeaders);
  }

  async _doProxyRequest(ctx, url, host, req, res) {
    ctx.log.debug(`Proxy ${req.method} request to ${url}`);

    // POST requests have a body
    const isBodyReq = !['GET', 'HEAD'].includes(req.method);

    //  do not cache  POST requests
    if (!isBodyReq && this._project.cacheDirectory) {
      const cached = await utils.getFromCache(
        url,
        this._project.cacheDirectory,
        ctx.log,
      );
      if (cached) {
        res
          .status(cached.status)
          .set(cached.headers)
          .cookie('hlx-proxyhost', host)
          .send(cached.body);
        return;
      }
    }

    let body;
    // pipe body if any
    if (isBodyReq) {
      body = new PassThrough();
      req.pipe(body);
    }

    const headers = {
      ...req.headers,
    };
    delete headers.cookie;
    delete headers.connection;
    delete headers.host;
    delete headers.referer;
    await this._updateHeaders(headers);

    const ret = await getFetch(ctx.config.allowInsecure)(url, {
      method: req.method,
      headers,
      cache: 'no-store',
      redirect: 'manual',
      body,
    });

    const contentType = ret.headers.get('content-type') || 'text/plain';
    const level = utils.status2level(ret.status, true);
    ctx.log[level](`Proxy ${req.method} request to ${url}: ${ret.status} (${contentType})`);

    // because fetch decodes the response, we need to reset content encoding and length
    const respHeaders = Object.fromEntries(ret.headers.entries());
    delete respHeaders['content-encoding'];
    delete respHeaders['content-length'];

    // remove security "constraints"
    delete respHeaders['x-frame-options'];
    delete respHeaders['content-security-policy'];
    respHeaders['access-control-allow-origin'] = '*';
    delete respHeaders['set-cookie'];

    if (respHeaders.location) {
      const u = new URL(respHeaders.location, url);
      if (u.origin === host) {
        respHeaders.location = u.pathname;
      }
    }

    let buffer = await ret.buffer();
    if (contentType.includes('html') || contentType.includes('text')) {
      buffer = utils.rewriteUrl(buffer, host);
    }

    if (!isBodyReq && this._project.cacheDirectory) {
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

    res
      .status(ret.status)
      .set(respHeaders)
      .cookie('hlx-proxyhost', host)
      .send(buffer);
    ret.body.pipe(res);
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
        host = new URL(host).origin;
        const url = this._makeProxyURL(ctx.url, host);
        await this._doProxyRequest(ctx, url, host, req, res);
      // codecov:ignore:start
      /* c8 ignore start */
      } catch (err) {
        log.error(`Failed to proxy AEM request ${ctx.path}: ${err.message}`);
        res.status(502).send(`Failed to proxy AEM request: ${err.message}`);
      }
      // codecov:ignore:end
      /* c8 ignore end */
    }

    this.emit('request', req, res, ctx);
  }

  async setupApp() {
    await super.setupApp();
    const localFiles = ['/tools/*', '/component-definition.json', '/component-filters.json', '/component-models.json'];
    localFiles.forEach((file) => {
      this.app.get(file, asyncHandler(this.handleToolsRequest.bind(this)));
    });
    const handler = asyncHandler(this.handleProxyModeRequest.bind(this));
    this.app.get('*', handler);
    this.app.post('*', handler);
  }

  async doStop() {
    await super.doStop();
    await resetContext();
  }
}
