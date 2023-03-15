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
import EventEmitter from 'events';
import { ConsoleLogger, deriveLogger, SimpleInterface } from '@adobe/helix-log';

export class BaseProject extends EventEmitter {
  constructor(Server) {
    super();
    this._cwd = process.cwd();
    this._server = new Server(this);
    this._server.on('stopped', async () => {
      await this.stop();
    });
    this._stopping = false;
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

  withBindAddr(addr) {
    this._server.withAddr(addr);
    return this;
  }

  withTLS(key, cert) {
    this._server.withTLS(key, cert);
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
    return this;
  }

  async start() {
    await this._server.start(this);
    return this;
  }

  async doStop() {
    await this._server.stop();
  }

  async stop() {
    if (this._stopping) {
      return this;
    }
    this._stopping = true;
    this.emit('stopping');
    await this.doStop();
    this.emit('stopped');
    return this;
  }
}
