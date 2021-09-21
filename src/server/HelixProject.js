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

const fs = require('fs-extra');
const path = require('path');
const { SimpleInterface, deriveLogger } = require('@adobe/helix-log');
const HelixServer = require('./HelixServer.js');
const LiveReload = require('./LiveReload.js');

const GIT_DIR = '.git';

async function isDirectory(dirPath) {
  return fs.stat(dirPath).then((stats) => stats.isDirectory()).catch(() => false);
}

class HelixProject {
  constructor() {
    this._cwd = process.cwd();
    this._server = new HelixServer(this);
    this._logger = null;
    this._gitMgr = null;
    this._liveReload = null;
    this._enableLiveReload = false;
    this._proxyUrl = null;
    this._proxyCache = true;
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

  withLogsDir(dir) {
    this._logsDir = dir;
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

  withProxyCache(value) {
    this._proxyCache = value;
    return this;
  }

  registerGitRepository(repoPath, gitUrl) {
    if (this._gitMgr) {
      this._gitMgr.registerServer(repoPath, gitUrl);
    }
    return this;
  }

  get log() {
    return this._logger;
  }

  get started() {
    return this._server.isStarted();
  }

  get gitState() {
    return this._gitMgr ? this._gitMgr.state : null;
  }

  get liveReload() {
    return this._liveReload;
  }

  get proxyUrl() {
    return this._proxyUrl;
  }

  get proxyCache() {
    return this._proxyCache;
  }

  get directory() {
    return this._cwd;
  }

  /**
   * Returns the helix server
   * @returns {HelixServer}
   */
  get server() {
    return this._server;
  }

  async checkPaths() {
    const dotGitPath = path.join(this._cwd, GIT_DIR);
    if (await isDirectory(dotGitPath)) {
      this._repoPath = path.resolve(dotGitPath, '../');
    }
  }

  /**
   * Invalidates the node module cache of the file in the build directory.
   */
  async invalidateCache() {
    if (this.liveReload) {
      this.liveReload.changed(['/']);
    }
  }

  async init() {
    if (!this._logger) {
      this._logger = new SimpleInterface({
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
    return this;
  }

  initLiveReload(app, server) {
    if (this.liveReload) {
      this.liveReload.init(app, server);
    }
  }

  async start() {
    this.log.debug('Launching helix simulation server for development...');
    await this._server.init();
    await this._server.start(this);
    return this;
  }

  async stop() {
    this.log.debug('Stopping helix simulation server..');
    await this._server.stop();
    if (this._gitMgr) {
      await this._gitMgr.stop();
    }
    if (this.liveReload) {
      this.liveReload.stop();
    }
    return this;
  }
}

module.exports = HelixProject;
