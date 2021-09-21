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

'use strict';

const EventEmitter = require('events');
const { MountConfig, IndexConfig } = require('@adobe/helix-shared-config');
const { getOrCreateLogger } = require('./log-common');

class AbstractCommand extends EventEmitter {
  constructor(logger) {
    super();
    this._initialized = false;
    this._logger = logger || getOrCreateLogger();
    this._directory = process.cwd();
    this._indexConfig = new IndexConfig().withLogger(this._logger);
    this._mountConfig = new MountConfig().withLogger(this._logger);
  }

  withDirectory(dir) {
    this._directory = dir;
    return this;
  }

  get log() {
    return this._logger;
  }

  get directory() {
    return this._directory;
  }

  // eslint-disable-next-line class-methods-use-this
  get requireConfigFile() {
    return true;
  }

  get indexConfig() {
    return this._indexConfig;
  }

  get mountConfig() {
    return this._mountConfig;
  }

  async init() {
    if (!this._initialized) {
      await this._indexConfig.init();
      await this._mountConfig.init();
      this._initialized = true;
    }
    return this;
  }

  async reloadConfig() {
    if (!this._initialized) {
      return this.init();
    }
    this._helixConfig = await (new MountConfig()
      .withLogger(this._helixConfig.log)
      .withDirectory(this._directory)
      .init());
    this._indexConfig = await (new IndexConfig()
      .withLogger(this._indexConfig.log)
      .withDirectory(this._directory)
      .init());
    return this;
  }
}

module.exports = AbstractCommand;
