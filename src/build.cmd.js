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
const HTLAsset = require('@adobe/parcel-plugin-htl/src/HTLAsset.js');
const glob = require('glob');
const path = require('path');
const fse = require('fs-extra');
const klawSync = require('klaw-sync');
const md5 = require('./md5.js');
const AbstractCommand = require('./abstract.cmd.js');

class BuildCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._cache = null;
    this._minify = false;
    this._target = null;
    this._files = null;
    this._distDir = null;
    this._webroot = null;
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
    return bundler;
  }

  async writeManifest() {
    const mf = {};
    const jobs = [];
    if (await fse.pathExists(this._webroot)) {
      // todo: consider using async klaw
      const filter = (item) => {
        const basename = path.basename(item.path);
        return basename === '.' || basename[0] !== '.' || basename === 'node_modules';
      };

      klawSync(this._webroot, {
        nodir: true,
        filter,
      }).forEach(async (f) => {
        const info = {
          size: f.stats.size,
          hash: '',
        };
        jobs.push(new Promise((resolve, reject) => {
          md5.file(f.path).then((hash) => {
            info.hash = hash;
            resolve();
          }).catch(reject);
        }));
        mf[path.relative(this._webroot, f.path)] = info;
      });
    }
    await Promise.all(jobs);
    return fse.writeFile(path.resolve(this._target, 'manifest.json'), JSON.stringify(mf, null, '  '));
  }

  /**
   * Fix source mapping URL.
   *
   * #190 sourceMappingURL annotation is incorrect
   * see: https://github.com/parcel-bundler/parcel/issues/1028#issuecomment-374537098
   *
   * @param bnd the parcel bundle
   */
  // eslint-disable-next-line class-methods-use-this
  async fixSourceMappingURL(bnd) {
    if (bnd.type) {
      // eslint-disable-next-line no-param-reassign
      bnd.htl = bnd.entryAsset instanceof HTLAsset;
      if (bnd.type === 'map' && bnd.parentBundle.htl) {
        // eslint-disable-next-line no-param-reassign
        bnd.htl = true;
      }
      if (bnd.htl && bnd.type === 'js') {
        // strip leading / from sourceMappingURL
        const contents = await fse.readFile(bnd.name, 'utf8');
        const fixed = contents.replace(/\/\/# sourceMappingURL=\//, '//# sourceMappingURL=');
        if (contents !== fixed) {
          await fse.writeFile(bnd.name, fixed, 'utf-8');
        }
      }
    }
    const jobs = [];
    bnd.childBundles.forEach((b) => {
      jobs.push(this.fixSourceMappingURL(b));
    });
    return Promise.all(jobs);
  }

  async run() {
    await this.init();

    // expand patterns from command line arguments
    const myfiles = this._files.reduce((a, f) => [...a, ...glob.sync(f)], []);

    const bundler = await this.createBundler(myfiles);
    const bundle = await bundler.bundle();
    if (bundle) {
      await this.fixSourceMappingURL(bundle);
      await this.writeManifest();
    }
  }
}

module.exports = BuildCommand;
