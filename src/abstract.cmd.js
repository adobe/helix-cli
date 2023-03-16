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
import { getOrCreateLogger } from './log-common.js';

export class AbstractCommand extends EventEmitter {
  constructor(logger) {
    super();
    this._initialized = false;
    this._logger = logger || getOrCreateLogger();
    this._directory = process.cwd();
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

  async init() {
    if (!this._initialized) {
      this._initialized = true;
    }
    return this;
  }
}
