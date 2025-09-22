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
import path, { resolve } from 'path';
import { lstat } from 'fs/promises';
import { IgnoreConfig } from '@adobe/helix-shared-config';
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
    this._hlxIgnore = null;
  }

  withLiveReload(value) {
    this._server.withLiveReload(value);
    return this;
  }

  withForwardBrowserLogs(value) {
    this._server.withForwardBrowserLogs(value);
    return this;
  }

  withSiteToken(value) {
    this.siteToken = value;
    this._server.withSiteToken(value);
    return this;
  }

  withSite(site) {
    this._site = site;
    return this;
  }

  withOrg(org) {
    this._org = org;
    return this;
  }

  withSiteLoginUrl(value) {
    this._siteLoginUrl = value;
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

  withCookies(value) {
    this._server.withCookies(value);
    return this;
  }

  withHtmlFolder(value) {
    if (value) {
      // Security: reject any paths with traversal patterns or absolute paths
      if (path.isAbsolute(value) || value.includes('..') || value.startsWith('/')) {
        throw new Error(`Invalid HTML folder name: ${value} only folders within the current workspace are allowed`);
      }

      this._htmlFolder = value;
      this._server.withHtmlFolder(value);
    } else {
      this._htmlFolder = value;
      this._server.withHtmlFolder(value);
    }
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

  get org() {
    return this._org;
  }

  get site() {
    return this._site;
  }

  get siteLoginUrl() {
    return this._siteLoginUrl;
  }

  get file404html() {
    return this._file404html;
  }

  get headHtml() {
    return this._headHtml;
  }

  get htmlFolder() {
    return this._htmlFolder;
  }

  get hlxIgnore() {
    return this._hlxIgnore;
  }

  async init() {
    await super.init();
    this._indexer = new Indexer()
      .withLogger(this._logger)
      .withCwd(this._cwd)
      .withPrintIndex(this._printIndex);

    // Initialize IgnoreConfig for .hlxignore support
    this._hlxIgnore = new IgnoreConfig()
      .withDirectory(this._cwd);

    try {
      await this._hlxIgnore.init();
    } catch (e) {
      // .hlxignore file doesn't exist or couldn't be loaded, which is fine
      this._hlxIgnore = null;
    }

    return this;
  }

  async initHeadHtml() {
    if (this.proxyUrl) {
      this._headHtml = new HeadHtmlSupport({
        directory: this.directory,
        log: this.log,
        proxyUrl: this.proxyUrl,
        allowInsecure: this.allowInsecure,
        siteToken: this.siteToken,
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

  async initHtmlFolder() {
    if (this._htmlFolder && this.liveReload) {
      const htmlFolderPath = resolve(this.directory, this._htmlFolder);
      try {
        await lstat(htmlFolderPath);
        this.log.debug(`Registered HTML folder for live-reload: ${this._htmlFolder}`);
        // Watch all HTML files in the folder - only .html extension
        this.liveReload.registerFiles([`${htmlFolderPath}/**/*.html`], `/${this._htmlFolder}/`);
      } catch (e) {
        this.log.error(`HTML folder '${this._htmlFolder}' does not exist`);
        throw new Error(`HTML folder '${this._htmlFolder}' does not exist`);
      }
    }
  }

  async initHlxIgnore() {
    if (this._hlxIgnore && this.liveReload) {
      const hlxIgnorePath = resolve(this.directory, '.hlxignore');
      try {
        await lstat(hlxIgnorePath);
        this.log.debug('detected .hlxignore file');
        if (this.liveReload) {
          this.liveReload.registerFiles([hlxIgnorePath], '/');
          this.liveReload.on('modified', async (modified) => {
            if (modified.includes('.hlxignore')) {
              this.log.debug('Reloading .hlxignore file');
              // Re-initialize the IgnoreConfig to reload the file
              try {
                await this._hlxIgnore.init();
              } catch (e) {
                // If reload fails, just continue without ignore support
                this._hlxIgnore = null;
              }
            }
          });
        }
      } catch (e) {
        // .hlxignore doesn't exist, which is fine
      }
    }
  }

  async start() {
    this.log.debug('Launching AEM dev server...');
    await super.start();
    await this.initHeadHtml();
    await this.init404Html();
    await this.initHtmlFolder();
    await this.initHlxIgnore();
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
