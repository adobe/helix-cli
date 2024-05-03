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
import { resolve } from 'path';
import { lstat } from 'fs/promises';
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
    this._allowInsecure = false;
    this._file404html = null;
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

  withAllowInsecure(value) {
    this._allowInsecure = value;
    return this;
  }

  get proxyUrl() {
    return this._proxyUrl;
  }

  get allowInsecure() {
    return this._allowInsecure;
  }

  get indexer() {
    return this._indexer;
  }

  get liveReload() {
    // eslint-disable-next-line no-underscore-dangle
    return this._server._liveReload;
  }

  get file404html() {
    return this._file404html;
  }

  get headHtml() {
    return this._headHtml;
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
        allowInsecure: this.allowInsecure,
      });

      // register local head in live-reload
      if (this.liveReload) {
        this.liveReload.registerFiles([this._headHtml.filePath], '/');
        this.liveReload.on('modified', async (modified) => {
          if (modified.indexOf('/') >= 0) {
            this._headHtml.invalidateLocal();
          }
        });
      }
    }
  }

  async init404Html() {
    if (this.proxyUrl) {
      this._file404html = resolve(this.directory, '404.html');
      try {
        await lstat(this._file404html);
        this.log.debug('detected local 404.html');
        if (this.liveReload) {
          this.liveReload.registerFiles([this._file404html], '/');
        }
      } catch (e) {
        this._file404html = null;
      }
    }
  }

  async start() {
    this.log.debug('Launching AEM dev server...');
    await super.start();
    await this.initHeadHtml();
    await this.init404Html();
    if (this._indexer) {
      await this._indexer.init();
    }
    return this;
  }

  async doStop() {
    this.log.debug('Stopping AEM dev server...');
    await super.doStop();
    if (this._indexer) {
      await this._indexer.close();
      delete this._indexer;
    }
  }
}
