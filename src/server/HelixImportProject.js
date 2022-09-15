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
import HelixImportServer from './HelixImportServer.js';

export default class HelixProject {
  constructor() {
    this._cwd = process.cwd();
    this._server = new HelixImportServer(this);
    this._logger = null;
    this._cacheDirectory = null;
    this._kill = false;
  }

  withCwd(cwd) {
    this._cwd = cwd;
    return this;
  }

  withKill(kill) {
    this._kill = !!kill;
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

  withCacheDirectory(value) {
    this._cacheDirectory = value;
    return this;
  }

  get log() {
    return this._logger;
  }

  get started() {
    return this._server.isStarted();
  }

  get cacheDirectory() {
    return this._cacheDirectory;
  }

  get directory() {
    return this._cwd;
  }

  get kill() {
    return this._kill;
  }

  /**
   * Returns the helix server
   * @returns {HelixImportServer}
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

    return this;
  }

  async start() {
    this.log.debug('Launching Franklin import server for importing content...');
    await this._server.start(this);
    return this;
  }

  async stop() {
    this.log.debug('Stopping Franklin import server..');
    await this._server.stop();
    return this;
  }
}
