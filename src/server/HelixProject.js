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
import { ConsoleLogger, deriveLogger, SimpleInterface } from '@adobe/helix-log';
import HelixServer from './HelixServer.js';
import LiveReload from './LiveReload.js';
import HeadHtmlSupport from './HeadHtmlSupport.js';
import Indexer from './Indexer.js';

export default class HelixProject {
  constructor() {
    this._cwd = process.cwd();
    this._server = new HelixServer(this);
    this._logger = null;
    this._liveReload = null;
    this._enableLiveReload = false;
    this._proxyUrl = null;
    this._headHtml = null;
    this._indexer = null;
    this._printIndex = false;
  }

  withCwd(cwd) {
    this._cwd = cwd;
    return this;
  }

  withHttpPort(port) {
    this._server.withPort(port);
    return this;
  }

  withLogger(logger) {
    this._logger = logger;
    return this;
  }

  withLiveReload(value) {
    this._enableLiveReload = value;
    return this;
  }

  withProxyUrl(value) {
    this._proxyUrl = value;
    return this;
  }

  withPrintIndex(value) {
    this._printIndex = value;
    return this;
  }

  get log() {
    return this._logger;
  }

  get started() {
    return this._server.isStarted();
  }

  get liveReload() {
    return this._liveReload;
  }

  get proxyUrl() {
    return this._proxyUrl;
  }

  get directory() {
    return this._cwd;
  }

  get indexer() {
    return this._indexer;
  }

  /**
   * Returns the helix server
   * @returns {HelixServer}
   */
  get server() {
    return this._server;
  }

  async init() {
    if (!this._logger) {
      this._logger = new SimpleInterface({
        logger: new ConsoleLogger(),
        level: 'debug',
        defaultFields: {
          category: 'hlx',
        },
        filter: (fields) => {
          // eslint-disable-next-line no-param-reassign
          fields.message[0] = `[${fields.category}] ${fields.message[0]}`;
          // eslint-disable-next-line no-param-reassign
          delete fields.category;
          return fields;
        },
      });
    } else {
      this._logger = deriveLogger(this._logger, {
        defaultFields: {
          category: 'hlx',
        },
      });
    }
    this._liveReload = this._enableLiveReload ? new LiveReload(this._logger) : null;
    this._indexer = new Indexer()
      .withLogger(this._logger)
      .withCwd(this._cwd)
      .withPrintIndex(this._printIndex);
    return this;
  }

  initLiveReload(app, server) {
    if (this.liveReload) {
      this.liveReload.init(app, server);
    }
  }

  async initHeadHtml() {
    if (this.proxyUrl) {
      this.headHtml = new HeadHtmlSupport({
        directory: this.directory,
        log: this.log,
        proxyUrl: this.proxyUrl,
      });
      await this.headHtml.init();

      // register local head in live-reload
      if (this.liveReload) {
        this.liveReload.registerFiles([this.headHtml.filePath], '/');
        this.liveReload.on('modified', async (modified) => {
          if (modified.indexOf('/') >= 0) {
            await this.headHtml.loadLocal();
            await this.headHtml.init();
          }
        });
      }
    }
  }

  async start() {
    this.log.debug('Launching helix simulation server for development...');
    await this._server.start(this);
    if (this._indexer) {
      await this._indexer.init();
    }
    return this;
  }

  async stop() {
    this.log.debug('Stopping helix simulation server..');
    await this._server.stop();
    if (this.liveReload) {
      this.liveReload.stop();
    }
    if (this._indexer) {
      await this._indexer.close();
    }
    return this;
  }
}
