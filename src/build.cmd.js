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

const EventEmitter = require('events');
const Bundler = require('parcel-bundler');
const glob = require('glob');
const path = require('path');
const chalk = require('chalk');
const fse = require('fs-extra');
const { DEFAULT_OPTIONS } = require('./defaults.js');

class BuildCommand extends EventEmitter {
  constructor() {
    super();
    this._cache = null;
    this._minify = false;
    this._target = null;
    this._files = null;
    this._staticFiles = ['**/static/*'];
    this._staticDir = null;
    this._distDir = null;
    this._cwd = process.cwd();
  }

  withDirectory(dir) {
    this._cwd = dir;
    return this;
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

  withStaticFiles(files) {
    this._files = files;
    return this;
  }

  withStaticDir(value) {
    this._staticDir = value;
    return this;
  }

  async copyStaticFile(report) {
    const myfiles = this._staticFiles.reduce((a, f) => [...a, ...glob.sync(f, {
      cwd: this._staticDir,
      absolute: false,
    })], []);
    const jobs = myfiles.map((f) => {
      const segs = f.split(path.sep).filter(s => s !== 'static');
      const dst = path.resolve(this._distDir, ...segs);
      const src = path.resolve(this._staticDir, f);
      return new Promise((resolve, reject) => {
        fse.copy(src, dst).then(() => {
          if (report) {
            const relDest = path.relative(this._distDir, dst);
            const relDist = path.relative(this._cwd, this._distDir);
            console.log(chalk.yellow('cp ') + chalk.gray(relDist + path.sep) + chalk.cyanBright(relDest));
          }
          resolve();
        }).catch(reject);
      });
    });

    return Promise.all(jobs);
  }

  async validate() {
    if (!this._distDir) {
      this._distDir = path.resolve(path.dirname(this._target), 'dist');
    }
    if (!this._staticDir) {
      this._staticDir = path.resolve(this._cwd, 'src');
    }
  }

  async run() {
    // override default options with command line arguments
    const myoptions = {
      ...DEFAULT_OPTIONS,
      watch: false,
      cache: this._cache,
      minify: this._minify,
      outDir: this._target,
    };

    this.validate();

    // expand patterns from command line arguments
    const myfiles = this._files.reduce((a, f) => [...a, ...glob.sync(f)], []);

    // copy the static files
    const t0 = Date.now();
    await this.copyStaticFile(true);
    console.log(chalk.greenBright(`✨  Copied static in ${Date.now() - t0}ms.\n`));

    const bundler = new Bundler(myfiles, myoptions);
    bundler.addAssetType('htl', require.resolve('@adobe/parcel-plugin-htl/src/HTLPreAsset.js'));
    bundler.addAssetType('htl-preprocessed', require.resolve('@adobe/parcel-plugin-htl/src/HTLAsset.js'));
    bundler.addAssetType('helix-js', require.resolve('./parcel/HelixAsset.js'));
    await bundler.bundle();
  }
}

module.exports = BuildCommand;
