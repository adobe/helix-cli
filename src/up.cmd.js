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

const glob = require('glob');
const opn = require('opn');
const { HelixProject } = require('@adobe/petridish');
const BuildCommand = require('./build.cmd');
const { DEFAULT_OPTIONS } = require('./defaults.js');
const pkgJson = require('../package.json');

class UpCommand extends BuildCommand {
  constructor() {
    super();
    this._httpPort = -1;
    this._open = false;
  }

  withHttpPort(p) {
    this._httpPort = p;
    return this;
  }

  withOpen(o) {
    this._open = !!o;
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
    if (this._watcher) {
      await this._watcher.close();
      this._watcher = null;
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

    this._bundler = this.createBundler(myfiles, myoptions);

    this.validate();

    this._project = new HelixProject()
      .withCwd(this._cwd)
      .withBuildDir(this._target)
      .withDistDir(this._distDir)
      .withDisplayVersion(pkgJson.version);

    if (this._httpPort >= 0) {
      this._project.withHttpPort(this._httpPort);
    }

    const buildEnd = async () => {
      if (this._project.started) {
        this.emit('build', this);
        // todo
        // this._project.invalidateCache();
        return;
      }

      await this._project.start();
      this.emit('started', this);
      if (this._open) {
        opn(`http://localhost:${this._project.server.port}/index.html`);
      }
    };

    const bundled = async (bundle) => {
      // get the static files processed by parcel.
      await this.extractStaticFiles(bundle);
      await this.writeManifest();
    };

    try {
      await this._project.init();
    } catch (e) {
      throw Error(`Unable to start helix: ${e.message}`);
    }

    this._bundler.on('buildEnd', buildEnd);
    this._bundler.on('bundled', bundled);
    this._bundler.bundle();
  }
}

module.exports = UpCommand;
