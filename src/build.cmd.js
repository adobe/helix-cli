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

const Bundler = require('parcel-bundler');
const glob = require('glob');
const path = require('path');
const RawJSPackager = require('./parcel/RawJSPackager.js');
const AbstractCommand = require('./abstract.cmd.js');

class BuildCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._cache = null;
    this._minify = false;
    this._target = null;
    this._files = null;
    this._webroot = null;
    this.withRequireConfigFile(false);
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

  withWebRoot(root) {
    this._webroot = root;
    return this;
  }

  /**
   * @override
   */
  async init() {
    await super.init();

    if (!this._webroot) {
      const defaultStaticRoot = this.config.strains.get('default').static.path;
      if (defaultStaticRoot) {
        this._webroot = path.resolve(this.directory, defaultStaticRoot.replace(/^\/+/, ''));
      }
    }
    if (!this._webroot) {
      this._webroot = this.directory;
    }

    // ensure target is absolute
    this._target = path.resolve(this.directory, this._target);
  }

  async getBundlerOptions() {
    return {
      cacheDir: path.resolve(this.directory, '.hlx', 'cache'),
      target: 'node',
      logLevel: 3,
      detailedReport: true,
      watch: false,
      cache: this._cache,
      minify: this._minify,
      outDir: this._target,
      killWorkers: true,
    };
  }

  /**
   * Initializes the parcel bundler.
   * @param files entry files
   * @return {Bundler} the bundler
   */
  async createBundler(files) {
    const options = await this.getBundlerOptions();
    const bundler = new Bundler(files, options);
    bundler.addAssetType('htl', require.resolve('@adobe/parcel-plugin-htl/src/HTLAsset.js'));
    bundler.addAssetType('helix-js', require.resolve('./parcel/HelixAsset.js'));
    bundler.addAssetType('js', require.resolve('./parcel/AdapterJSAsset.js'));
    bundler.addAssetType('helix-pre-js', require.resolve('./parcel/ProxyJSAsset.js'));
    bundler.addPackager('js', RawJSPackager);
    return bundler;
  }

  async build() {
    this.emit('buildStart');
    // expand patterns from command line arguments
    const myfiles = this._files.reduce((a, f) => [...a, ...glob.sync(f)], []);
    const bundler = await this.createBundler(myfiles);
    const bundle = await bundler.bundle();
    this.emit('buildEnd');
    return bundle;
  }

  async run() {
    await this.init();
    await this.build();
  }
}

module.exports = BuildCommand;
