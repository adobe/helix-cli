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
const { HelixConfig } = require('@adobe/helix-shared');
const { makeLogger } = require('./log-common');
const ConfigUtils = require('./config/config-utils.js');

class AbstractCommand extends EventEmitter {
  constructor(logger) {
    super();
    this._initialized = false;
    this._logger = logger || makeLogger();
    this._helixConfig = new HelixConfig().withLogger(this._logger);
    this._requireConfigFile = true;
  }

  withDirectory(dir) {
    this._helixConfig.withDirectory(dir);
    return this;
  }

  get log() {
    return this._logger;
  }

  get directory() {
    return this._helixConfig.directory;
  }

  withRequireConfigFile(value) {
    this._requireConfigFile = value;
    return this;
  }

  withConfigFile(file) {
    this._helixConfig.withConfigPath(file);
    return this;
  }

  get config() {
    if (!this._initialized) {
      throw Error('illegal access to #config before initialized');
    }
    return this._helixConfig;
  }

  async init() {
    if (!this._initialized) {
      if (!this._requireConfigFile && !(await this._helixConfig.hasFile())) {
        // set default config
        this._helixConfig.withSource(await ConfigUtils.createDefaultConfig());
      }
      await this._helixConfig.init();
      this._initialized = true;
    }
    return this;
  }

  async reloadConfig() {
    if (!this._initialized) {
      return this.init();
    }
    this._helixConfig = await (new HelixConfig()
      .withLogger(this._helixConfig.log)
      .withConfigPath(this._helixConfig.configPath)
      .withDirectory(this._helixConfig.directory)
      .init());
    return this;
  }
}

module.exports = AbstractCommand;
