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
const HelixPages = require('./helix-pages.js');

class BuildCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._target = null;
    this._files = null;
    this._sourceRoot = './';
    this._helixPagesRepo = '';
    this._helixPages = null;
    this._modulePaths = [];
    this._requiredModules = ['@adobe/helix-pipeline'];
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

  get helixPages() {
    return this._helixPages;
  }

  withModulePaths(value) {
    this._modulePaths = value;
    return this;
  }

  get modulePaths() {
    return this._modulePaths;
  }

  withRequiredModules(mods) {
    if (mods) {
      this._requiredModules = mods;
    }
    return this;
  }

  /**
   * @override
   */
  async init() {
    await super.init();

    this._helixPages = new HelixPages(this._logger).withDirectory(this.directory);
    // currently only used for testing
    if (this._helixPagesRepo) {
      this._helixPages.withRepo(this._helixPagesRepo);
    }
    await this._helixPages.init();

    // ensure target is absolute
    this._target = path.resolve(this.directory, this._target);
    this._sourceRoot = path.resolve(this.directory, this._sourceRoot);
  }

  async build() {
    this.emit('buildStart');

    const builder = new Builder()
      .withDirectory(this.directory)
      .withSourceRoot(this._sourceRoot)
      .withBuildDir(this._target)
      .withLogger(this.log)
      .withFiles(this._files)
      .withRequiredModules(this._requiredModules)
      .withShowReport(true);

    if (await this.helixPages.isPagesProject()) {
      await this.helixPages.prepare();

      // use bundled helix-pages sources and modules
      builder
        .withFiles(['src/**/*.htl', 'src/**/*.js'])
        .withSourceRoot(this.helixPages.checkoutDirectory)
        .withModulePaths([
          path.resolve(this.helixPages.checkoutDirectory, 'node_modules'),
          path.resolve(this._target, 'node_modules'),
        ]);
    }

    // allow setting modules paths from tests
    if (this._modulePaths.length > 0) {
      builder.withModulePaths(this._modulePaths);
    } else {
      this._modulePaths = builder.modulePaths;
    }


    await builder.run();
    this.emit('buildEnd');
  }

  async run() {
    await this.init();
    await this.build();
  }
}

module.exports = BuildCommand;
