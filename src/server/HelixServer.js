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
import crypto from 'crypto';
import express from 'express';
import { promisify } from 'util';
import path from 'path';
import compression from 'compression';
import utils from './utils.js';
import RequestContext from './RequestContext.js';
import { asyncHandler, BaseServer } from './BaseServer.js';
import LiveReload from './LiveReload.js';
import { saveSiteTokenToFile } from '../config/config-utils.js';

const LOGIN_ROUTE = '/.aem/cli/login';
const LOGIN_ACK_ROUTE = '/.aem/cli/login/ack';

export class HelixServer extends BaseServer {
  /**
   * Creates a new HelixServer for the given project.
   * @param {HelixProject} project
   */
  constructor(project) {
    super(project);
    this._liveReload = null;
    this._enableLiveReload = false;
    this._app.use(compression());
    this._autoLogin = true;
    this._cookies = false;
  }

  withLiveReload(value) {
    this._enableLiveReload = value;
    return this;
  }

  withSiteToken(value) {
    this._siteToken = value;
    return this;
  }

  withCookies(value) {
    this._cookies = value;
    return this;
  }

  async handleLogin(req, res) {
    // disable autologin if login was called at least once
    this._autoLogin = false;
    // clear any previous login errors
    delete this.loginError;

    if (!this._project.siteLoginUrl) {
      res.status(404).send('Login not supported. Could not extract site and org information.');
      return;
    }

    this.log.info(`Starting login process for : ${this._project.org}/${this._project.site}. Redirecting...`);
    this._loginState = crypto.randomUUID();
    const loginUrl = `${this._project.siteLoginUrl}&state=${this._loginState}`;
    res.status(302).set('location', loginUrl).send('');
  }

  async handleLoginAck(req, res) {
    const CACHE_CONTROL = 'no-store, private, must-revalidate';
    const CORS_HEADERS = {
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    };

    const { origin } = req.headers;
    if (['https://admin.hlx.page', 'https://admin-ci.hlx.page'].includes(origin)) {
      CORS_HEADERS['access-control-allow-origin'] = origin;
    }

    if (req.method === 'OPTIONS') {
      res.status(200).set(CORS_HEADERS).send('');
      return;
    }

    if (req.method === 'POST') {
      const { state, siteToken } = req.body;
      try {
        if (!this._loginState || this._loginState !== state) {
          this.loginError = { message: 'Login Failed: We received an invalid state.' };
          this.log.warn('State mismatch. Discarding site token.');
          res.status(400)
            .set(CORS_HEADERS)
            .set('cache-control', CACHE_CONTROL)
            .send('Invalid state');
          return;
        }

        if (!siteToken) {
          this.loginError = { message: 'Login Failed: Missing site token.' };
          res.status(400)
            .set('cache-control', CACHE_CONTROL)
            .set(CORS_HEADERS)
            .send('Missing site token');
          return;
        }

        this.withSiteToken(siteToken);
        this._project.headHtml.setSiteToken(siteToken);
        await saveSiteTokenToFile(siteToken);
        this.log.info('Site token received and saved to file.');

        res.status(200)
          .set('cache-control', CACHE_CONTROL)
          .set(CORS_HEADERS)
          .send('Login successful.');
        return;
      } finally {
        delete this._loginState;
      }
    }

    if (this.loginError) {
      res.status(400)
        .set('cache-control', CACHE_CONTROL)
        .send(this.loginError.message);
      delete this.loginError;
      return;
    }

    res.status(302)
      .set('cache-control', CACHE_CONTROL)
      .set('location', '/')
      .send('');
  }

  /**
   * Proxy Mode route handler
   * @param {Express.Request} req request
   * @param {Express.Response} res response
   */
  async handleProxyModeRequest(req, res) {
    const sendFile = promisify(res.sendFile).bind(res);
    const ctx = new RequestContext(req, this._project);
    const { id } = ctx;
    const { log } = this;
    const proxyUrl = new URL(this._project.proxyUrl);

    const filePath = path.join(this._project.directory, ctx.path);
    if (path.relative(this._project.directory, filePath).startsWith('..')) {
      log.info(`refuse to serve file outside the project directory: ${filePath}`);
      res.status(403).send('');
      return;
    }

    const liveReload = this._liveReload;
    if (liveReload) {
      liveReload.startRequest(ctx.requestId, ctx.path);
    }
    const pfx = log.level === 'silly' ? `[${id}] ` : '';

    if (log.level === 'silly') {
      log.trace(`${pfx}>>>--------------------------`);
      log.trace(`${pfx}> ${req.method} ${req.url}`);
      Object.entries(req.headers).forEach(([name, value]) => {
        log.trace(`${pfx}> ${name}: ${value}`);
      });
      log.trace(`[${id}]`);
    }

    // try to serve static
    try {
      await sendFile(filePath, {
        dotfiles: 'allow',
        headers: {
          'access-control-allow-origin': '*',
        },
      });
      if (liveReload) {
        liveReload.registerFile(ctx.requestId, filePath);
      }
      log.debug(`${pfx}served local file ${filePath}`);
      return;
    } catch (e) {
      log.debug(`${pfx}unable to deliver local file ${ctx.path} - ${e.stack || e}`);
      if (res.headersSent) {
        return;
      }
    } finally {
      if (liveReload) {
        liveReload.endRequest(ctx.requestId);
      }
    }

    try {
      // use proxy
      const url = new URL(ctx.url, proxyUrl);
      for (const [key, value] of proxyUrl.searchParams.entries()) {
        url.searchParams.append(key, value);
      }

      await utils.proxyRequest(ctx, url.href, req, res, {
        injectLiveReload: this._project.liveReload,
        headHtml: this._project.headHtml,
        indexer: this._project.indexer,
        cacheDirectory: this._project.cacheDirectory,
        file404html: this._project.file404html,
        siteToken: this._siteToken,
        loginPath: LOGIN_ROUTE,
        autoLogin: this._autoLogin,
        cookies: this._cookies,
      });
    } catch (err) {
      log.error(`${pfx}failed to proxy AEM request ${ctx.path}: ${err.message}`);
      res.status(502).send(`Failed to proxy AEM request: ${err.message}`);
    }

    this.emit('request', req, res, ctx);
  }

  async setupApp() {
    await super.setupApp();
    if (this._enableLiveReload) {
      this._liveReload = new LiveReload(this.log);
      await this._liveReload.init(this.app, this._server);
    }

    this.app.get(LOGIN_ROUTE, asyncHandler(this.handleLogin.bind(this)));
    this.app.get(LOGIN_ACK_ROUTE, asyncHandler(this.handleLoginAck.bind(this)));
    this.app.post(LOGIN_ACK_ROUTE, express.json(), asyncHandler(this.handleLoginAck.bind(this)));
    this.app.options(LOGIN_ACK_ROUTE, asyncHandler(this.handleLoginAck.bind(this)));

    const handler = asyncHandler(this.handleProxyModeRequest.bind(this));
    this.app.get(/.*/, handler);
    this.app.post(/.*/, handler);
  }

  async doStop() {
    await super.stop();
    if (this._liveReload) {
      await this._liveReload.stop();
      delete this._liveReload;
    }
  }
}
