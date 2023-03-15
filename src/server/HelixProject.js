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
import { HelixServer } from './HelixServer.js';
import { BaseProject } from './BaseProject.js';
import HeadHtmlSupport from './HeadHtmlSupport.js';
import Indexer from './Indexer.js';

export class HelixProject extends BaseProject {
  constructor() {
    super(HelixServer);
    this._proxyUrl = null;
    this._headHtml = null;
    this._indexer = null;
    this._printIndex = false;
  }

  withLiveReload(value) {
    this._server.withLiveReload(value);
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

  get proxyUrl() {
    return this._proxyUrl;
  }

  get indexer() {
    return this._indexer;
  }

  get liveReload() {
    // eslint-disable-next-line no-underscore-dangle
    return this._server._liveReload;
  }

  async init() {
    await super.init();
    this._indexer = new Indexer()
      .withLogger(this._logger)
      .withCwd(this._cwd)
      .withPrintIndex(this._printIndex);
    return this;
  }

  async initHeadHtml() {
    if (this.proxyUrl) {
      this._headHtml = new HeadHtmlSupport({
        directory: this.directory,
        log: this.log,
        proxyUrl: this.proxyUrl,
      });
      await this._headHtml.init();

      // register local head in live-reload
      if (this.liveReload) {
        this.liveReload.registerFiles([this._headHtml.filePath], '/');
        this.liveReload.on('modified', async (modified) => {
          if (modified.indexOf('/') >= 0) {
            await this._headHtml.loadLocal();
            await this._headHtml.init();
          }
        });
      }
    }
  }

  async start() {
    this.log.debug('Launching Franklin dev server...');
    await super.start();
    await this.initHeadHtml();
    if (this._indexer) {
      await this._indexer.init();
    }
    return this;
  }

  async doStop() {
    this.log.debug('Stopping Franklin dev server...');
    await super.doStop();
    if (this._indexer) {
      await this._indexer.close();
      delete this._indexer;
    }
  }
}
