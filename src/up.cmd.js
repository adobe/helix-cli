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

const Bundler = require('parcel-bundler');
const glob = require('glob');
const fs = require('fs');
const chalk = require('chalk');
const { HelixProject } = require('@adobe/petridish');
const BuildCommand = require('./build.cmd');
const { DEFAULT_OPTIONS } = require('./defaults.js');

class UpCommand extends BuildCommand {
  constructor() {
    super();
    this._httpPort = -1;
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
    if (this._watcher) {
      await this._watcher.close();
      this._watcher = null;
    }
    console.log('Helix project stopped.');
    this.emit('stopped', this);
  }

  _watchStaticDir(fn) {
    let timer = null;
    this._watcher = fs.watch(this._staticDir, {
      recursive: true,
    }, (eventType, filename) => {
      // ignore non static, and .swp and ~ files
      if (/(.*\.swx|.*\.swp|.*~)/.test(filename)) {
        return;
      }
      if (!/.*static\/.*/.test(filename)) {
        return;
      }
      if (timer) {
        clearTimeout(timer);
      }
      // debounce a bit in case several files are changed at once
      timer = setTimeout(async () => {
        timer = null;
        await fn();
      }, 250);
    });
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
    this._bundler.addAssetType('htl', require.resolve('@adobe/parcel-plugin-htl/src/HTLAsset.js'));

    this.validate();

    this._project = new HelixProject()
      .withCwd(this._cwd)
      .withBuildDir(this._target)
      .withDistDir(this._distDir);

    if (this._httpPort >= 0) {
      this._project.withHttpPort(this._httpPort);
    }

    const buildEnd = async () => {
      // copy the static files
      const t0 = Date.now();
      await this.copyStaticFile();
      console.log(chalk.greenBright(`✨  Copied static in ${Date.now() - t0}ms.\n`));

      if (this._project.started) {
        this.emit('build', this);
        // todo
        // this._project.invalidateCache();
        return;
      }

      await this._project.start();
      this.emit('started', this);
    };

    this._watchStaticDir(buildEnd);
    this._bundler.on('buildEnd', buildEnd);

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
