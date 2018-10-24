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
const HTLPreAsset = require('@adobe/parcel-plugin-htl/src/HTLPreAsset.js');
const glob = require('glob');
const path = require('path');
const chalk = require('chalk');
const fse = require('fs-extra');
const klawSync = require('klaw-sync');
const md5 = require('./md5.js');
const AbstractCommand = require('./abstract.cmd.js');

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
    if (bnd.htl && bnd.type === 'js') {
      // strip leading / from sourceMappingURL
      // #190 sourceMappingURL annotation is incorrect
      // see: https://github.com/parcel-bundler/parcel/issues/1028#issuecomment-374537098
      const contents = fse.readFileSync(bnd.name, 'utf8');
      fse.writeFileSync(bnd.name, contents.replace(/\/\/# sourceMappingURL=\/dist\//, '//# sourceMappingURL='));
    }
    if (!bnd.htl) {
      statics.push(bnd.name);
    }
  }
  bnd.childBundles.forEach(async (child) => {
    statics.push(...findStaticFiles(child));
  });
  return statics;
}

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

  withDistDir(dist) {
    this._distDir = dist;
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

  async moveStaticFiles(files, report) {
    const jobs = files.map((src) => {
      const rel = path.relative(this._target, src);
      const dst = path.resolve(this._distDir, rel);
      return new Promise((resolve, reject) => {
        fse.move(src, dst, { overwrite: true }).then(() => {
          if (report) {
            const relDest = path.relative(this._distDir, dst);
            const relDist = path.relative(this.directory, this._distDir);
            this.log.info(chalk.gray(relDist + path.sep) + chalk.cyanBright(relDest));
          }
          resolve();
        }).catch(reject);
      });
    });
    return Promise.all(jobs);
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
    if (!this._distDir) {
      this._distDir = path.resolve(this._webroot, 'dist');
    }
  }

  async getBundlerOptions() {
    const opts = {
      cacheDir: path.resolve(this.directory, '.hlx', 'cache'),
      target: 'node',
      logLevel: 3,
      detailedReport: true,
      watch: false,
      cache: this._cache,
      minify: this._minify,
      outDir: this._target,
    };
    const relRoot = path.relative(this._webroot, this._distDir);
    if (relRoot) {
      opts.publicUrl = `/${relRoot}`;
    }
    return opts;
  }

  /**
   * Initializes the parcel bundler.
   * @param files entry files
   * @return {Bundler} the bundler
   */
  async createBundler(files) {
    const options = await this.getBundlerOptions();
    const bundler = new Bundler(files, options);
    bundler.addAssetType('htl', require.resolve('@adobe/parcel-plugin-htl/src/HTLPreAsset.js'));
    bundler.addAssetType('htl-preprocessed', require.resolve('@adobe/parcel-plugin-htl/src/HTLAsset.js'));
    bundler.addAssetType('helix-js', require.resolve('./parcel/HelixAsset.js'));
    return bundler;
  }

  async writeManifest() {
    const mf = {};
    const jobs = [];
    if (await fse.pathExists(this._distDir)) {
      // todo: consider using async klaw
      klawSync(this._distDir, {
        nodir: true,
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
        mf[path.relative(this._distDir, f.path)] = info;
      });
    }
    await Promise.all(jobs);
    return fse.writeFile(path.resolve(this._target, 'manifest.json'), JSON.stringify(mf, null, '  '));
  }

  async extractStaticFiles(bundle, report) {
    // get the static files processed by parcel.
    const staticFiles = findStaticFiles(bundle);

    if (staticFiles.length > 0) {
      if (report) {
        this.log.info(chalk.greenBright('\n✨  Moving static files in place:'));
      }
      await this.moveStaticFiles(staticFiles, report);
    }
  }

  async run() {
    await this.init();

    // expand patterns from command line arguments
    const myfiles = this._files.reduce((a, f) => [...a, ...glob.sync(f)], []);

    const bundler = await this.createBundler(myfiles);
    const bundle = await bundler.bundle();
    if (bundle) {
      await this.extractStaticFiles(bundle, true);
      await this.writeManifest();
    }
  }
}

module.exports = BuildCommand;
