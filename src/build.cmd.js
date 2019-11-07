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

const path = require('path');
const AbstractCommand = require('./abstract.cmd.js');
const Builder = require('./builder/Builder.js');

class BuildCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._target = null;
    this._files = null;
    this._sourceRoot = './';
  }

  // eslint-disable-next-line class-methods-use-this
  get requireConfigFile() {
    return false;
  }

  withTargetDir(target) {
    this._target = target;
    return this;
  }

  withFiles(files) {
    this._files = files;
    return this;
  }

  withSourceRoot(value) {
    this._sourceRoot = value;
    return this;
  }

  /**
   * @override
   */
  async init() {
    await super.init();

    // ensure target is absolute
    this._target = path.resolve(this.directory, this._target);
    this._sourceRoot = path.resolve(this.directory, this._sourceRoot);
  }

  createBuilder() {
    return new Builder()
      .withDirectory(this._sourceRoot)
      .withBuildDir(this._target)
      .withLogger(this.log)
      .withFiles(this._files)
      .withShowReport(true);
  }

  async build() {
    this.emit('buildStart');
    const builder = this.createBuilder();
    await builder.run();
    this.emit('buildEnd');
  }

  async run() {
    await this.init();
    await this.build();
  }
}

module.exports = BuildCommand;
