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

/* eslint no-console: off */

const Bundler = require('parcel-bundler');
const glob = require('glob');
const { DEFAULT_OPTIONS } = require('./defaults.js');

class BuildCommand {
  constructor() {
    this._cache = null;
    this._minify = false;
    this._target = null;
    this._files = null;
  }

  withCacheEnabled(cache) {
    this._cache = cache;
    return this;
  }

  withMinifyEnabled(target) {
    this._minify = target;
    return this;
  }

  withTargetDir(target) {
    this._target = target;
    return this;
  }

  withFiles(files) {
    this._files = files;
    return this;
  }

  async run() {
    // override default options with command line arguments
    const myoptions = {
      ...DEFAULT_OPTIONS,
      watch: true,
      cache: this._cache,
      minify: this._minify,
      outDir: this._target,
    };

    // expand patterns from command line arguments
    const myfiles = this._files.reduce((a, f) => [...a, ...glob.sync(f)], []);

    const bundler = new Bundler(myfiles, myoptions);

    bundler.bundle();
  }
}

module.exports = BuildCommand;
