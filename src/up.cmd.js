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
/* eslint no-console: off */

const EventEmitter = require('events');
const Bundler = require('parcel-bundler');
const glob = require('glob');
const { HelixProject } = require('@adobe/petridish');
const { DEFAULT_OPTIONS } = require('./defaults.js');

class UpCommand extends EventEmitter {
  constructor() {
    super();
    this._cache = null;
    this._minify = false;
    this._target = null;
    this._files = null;
    this._httpPort = -1;
    this._cwd = process.cwd();
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

  withDirectory(dir) {
    this._cwd = dir;
    return this;
  }

  withHttpPort(p) {
    this._httpPort = p;
    return this;
  }

  get project() {
    return this._project;
  }

  async stop() {
    if (this._bundler) {
      await this._bundler.stop();
      this._bundler = null;
    }
    if (this._project) {
      await this._project.stop();
      this._project = null;
    }
    console.log('Helix project stopped.');
    this.emit('stopped', this);
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

    this._bundler = new Bundler(myfiles, myoptions);

    this._project = new HelixProject()
      .withCwd(this._cwd)
      .withBuildDir(this._target);

    if (this._httpPort >= 0) {
      this._project.withHttpPort(this._httpPort);
    }

    this._bundler.on('buildEnd', () => {
      if (this._project.started) {
        this.emit('build', this);
        // todo
        // this._project.invalidateCache();
        return;
      }
      this._project.start().then(() => {
        this.emit('started', this);
      });
    });

    return this._project
      .init()
      .then(() => {
        this._bundler.bundle();
      }).catch((e) => {
        throw Error(`Unable to start helix: ${e.message}`);
      });
  }
}

module.exports = UpCommand;
