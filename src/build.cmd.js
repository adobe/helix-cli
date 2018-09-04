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
const HTLPreAsset = require('@adobe/parcel-plugin-htl/src/HTLPreAsset.js');
const glob = require('glob');
const path = require('path');
const chalk = require('chalk');
const fse = require('fs-extra');
const { DEFAULT_OPTIONS } = require('./defaults.js');

/**
 * Finds the non-htl files from the generated bundle
 * @param bnd the parcel bundle
 * @returns {Array} array of files.
 */
function findStaticFiles(bnd) {
  const statics = [];
  if (bnd.type) {
    // eslint-disable-next-line no-param-reassign
    bnd.htl = bnd.entryAsset instanceof HTLPreAsset;
    if (bnd.type === 'map' && bnd.parentBundle.htl) {
      // eslint-disable-next-line no-param-reassign
      bnd.htl = true;
    }
    if (!bnd.htl) {
      statics.push(bnd.name);
    }
  }
  bnd.childBundles.forEach((child) => {
    statics.push(...findStaticFiles(child));
  });
  return statics;
}

class BuildCommand extends EventEmitter {
  constructor() {
    super();
    this._cache = null;
    this._minify = false;
    this._target = null;
    this._files = null;
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

  withDistDir(dist) {
    this._distDir = dist;
    return this;
  }

  withFiles(files) {
    this._files = files;
    return this;
  }

  withStaticDir(value) {
    this._staticDir = value;
    return this;
  }

  async moveStaticFiles(files, report) {
    const jobs = files.map((src) => {
      const rel = path.relative(this._target, src);
      const dst = path.resolve(this._distDir, rel);
      return new Promise((resolve, reject) => {
        fse.move(src, dst, { overwrite: true }).then(() => {
          if (report) {
            const relDest = path.relative(this._distDir, dst);
            const relDist = path.relative(this._cwd, this._distDir);
            console.log(chalk.gray(relDist + path.sep) + chalk.cyanBright(relDest));
          }
          resolve();
        }).catch(reject);
      });
    });
    return Promise.all(jobs);
  }

  async validate() {
    if (!this._distDir) {
      this._distDir = path.resolve(this._cwd, 'dist');
    }
    if (!this._staticDir) {
      this._staticDir = path.resolve(this._cwd, 'src');
    }
  }

  /**
   * Initializes the parcel bundler.
   * @param files entry files
   * @param options bundler options
   * @return {Bundler} the bundler
   */
  // eslint-disable-next-line class-methods-use-this
  createBundler(files, options) {
    const bundler = new Bundler(files, options);
    bundler.addAssetType('htl', require.resolve('@adobe/parcel-plugin-htl/src/HTLPreAsset.js'));
    bundler.addAssetType('htl-preprocessed', require.resolve('@adobe/parcel-plugin-htl/src/HTLAsset.js'));
    bundler.addAssetType('helix-js', require.resolve('./parcel/HelixAsset.js'));
    return bundler;
  }

  async extractStaticFiles(bundle, report) {
    // get the static files processed by parcel.
    const staticFiles = findStaticFiles(bundle);

    if (staticFiles.length > 0) {
      if (report) {
        console.log(chalk.greenBright('\n✨  Moving static files in place:'));
      }
      await this.moveStaticFiles(staticFiles, report);
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

    const bundler = this.createBundler(myfiles, myoptions);
    const bundle = await bundler.bundle();
    if (bundle) {
      await this.extractStaticFiles(bundle, true);
    }
  }
}

module.exports = BuildCommand;
