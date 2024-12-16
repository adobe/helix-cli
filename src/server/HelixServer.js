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
import { promisify } from 'util';
import path from 'path';
import compression from 'compression';
import utils from './utils.js';
import RequestContext from './RequestContext.js';
import { asyncHandler, BaseServer } from './BaseServer.js';
import LiveReload from './LiveReload.js';
import { writeSiteTokenToEnv } from '../config/config-utils.js';

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
  }

  withLiveReload(value) {
    this._enableLiveReload = value;
    return this;
  }

  withSiteToken(value) {
    this._siteToken = value;
    return this;
  }

  async handleLogin(req, res) {
    // disable autologin if login was called at least once
    this._autoLogin = false;

    if (!this._project.siteLoginUrl) {
      res.status(404).send('Login not supported. Could not extract site and org information.');
      return;
    }
    this._loginOAuthState = crypto.randomUUID();
    const loginUrl = `${this._project.siteLoginUrl}&state=${this._loginOAuthState}`;
    res.status(302).set('location', loginUrl).send('');
  }

  async handleLoginAck(req, res) {
    if (req.query?.site_token) {
      if (this._loginOAuthState === req.query.state) {
        const siteToken = req.query.site_token;
        this.withSiteToken(siteToken);
        this._project.headHtml.setSiteToken(siteToken);
        await writeSiteTokenToEnv(siteToken);
        this.log.info('Site token received and saved to .env file.');
      } else {
        this.log.warn('OAuth state mismatch. Discarding site token.');
      }
      this._loginOAuthState = null;

      res.status(200).send('Login successful. You can resume your work.');
      return;
    }

    /*
     In the oauth implicit flow the token is returned in the hash fragment
     we use a small script to send it to the server using a fetch request
    */
    res.status(200)
      /*
       ensure that the referrer does not accidentally leak tokens
       although browsers should not sent fragments
      */
      .set('referrer-policy', 'no-referrer')
      .send(`
        <html>
          <head>
            <script>
              async function sendToken() {
                if (window.location.hash) {
                  await fetch(window.location.href.replace('#', '?'));
                  window.location.href = '/';
                }
              }
              sendToken();
            </script>
          </head>
        </html>
    `);
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

    // use proxy
    const url = new URL(ctx.url, proxyUrl);
    for (const [key, value] of proxyUrl.searchParams.entries()) {
      url.searchParams.append(key, value);
    }

    try {
      await utils.proxyRequest(ctx, url.href, req, res, {
        injectLiveReload: this._project.liveReload,
        headHtml: this._project.headHtml,
        indexer: this._project.indexer,
        cacheDirectory: this._project.cacheDirectory,
        file404html: this._project.file404html,
        siteToken: this._siteToken,
        loginPath: LOGIN_ROUTE,
        autoLogin: this._autoLogin,
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
    const handler = asyncHandler(this.handleProxyModeRequest.bind(this));
    this.app.get('*', handler);
    this.app.post('*', handler);
  }

  async doStop() {
    await super.stop();
    if (this._liveReload) {
      await this._liveReload.stop();
      delete this._liveReload;
    }
  }
}
