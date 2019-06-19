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
const fs = require('fs-extra');
const path = require('path');
const RawJSPackager = require('./parcel/RawJSPackager.js');
const AbstractCommand = require('./abstract.cmd.js');
const { each } = require('ferrum');

class BuildCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._target = null;
    this._files = null;
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

  /**
   * @override
   */
  async init() {
    await super.init();

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
      cache: false,
      minify: false,
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
    bundler.addAssetType('htl', require.resolve('./parcel/HTLAsset.js'));
    bundler.addAssetType('helix-js', require.resolve('./parcel/HelixAsset.js'));
    bundler.addAssetType('js', require.resolve('./parcel/AdapterJSAsset.js'));
    bundler.addAssetType('jsx', require.resolve('./parcel/AdapterJSAsset.js'));
    bundler.addAssetType('helix-pre-js', require.resolve('./parcel/ProxyJSAsset.js'));
    bundler.addPackager('js', RawJSPackager);
    return bundler;
  }

  async generateBundleIndex(bundle) {
    const cont = [];
    const P = x => cont.push(x);

    P('module.exports = {');
    P('  renderers: {');

    each(bundle.childBundles, (rendererBundle) => {
      // Stripping the suffix using the replace and using JSON to properly
      // quote any weird characters in the file
      const name = JSON.stringify(
        path.basename(rendererBundle.name).replace(/\.[^.]*$/, ''));
      // Using a relative path
      P(`    ${name}: ${name.replace(/^"/, '"./')},`);
    });

    P('  }');
    P('}');

    await fs.writeFile(
      path.join(this._target, 'helix-action-index.js'),
      cont.join('\n'));
  }

  async build() {
    this.emit('buildStart');
    // expand patterns from command line arguments
    const myfiles = this._files.reduce((a, f) => [...a, ...glob.sync(f)], []);
    const bundler = await this.createBundler(myfiles);
    const bundle = await bundler.bundle();
    await this.generateBundleIndex(bundle);
    this.emit('buildEnd');
    return bundle;
  }

  async run() {
    await this.init();
    await this.build();
  }
}

module.exports = BuildCommand;
