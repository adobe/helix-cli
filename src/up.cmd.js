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

const glob = require('glob');
const fs = require('fs');
const opn = require('opn');
const readline = require('readline');
const { HelixProject } = require('@adobe/petridish');
const logger = require('@adobe/petridish/src/logger'); // todo: unified logging
const BuildCommand = require('./build.cmd');
const pkgJson = require('../package.json');

const HELIX_CONFIG = 'helix-config.yaml';

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
    logger.info('Helix project stopped.');
    this.emit('stopped', this);
  }

  /**
   * Sets up the source file watcher.
   * @private
   */
  _initSourceWatcher(fn) {
    let timer = null;
    let modifiedFiles = {};
    this._watcher = fs.watch(this._cwd, {
      recursive: true,
    }, (eventType, filename) => {
      if (filename.indexOf('src/') < 0 && filename !== HELIX_CONFIG) {
        return;
      }
      // ignore some files
      if (/(.*\.swx|.*\.swp|.*~)/.test(filename)) {
        return;
      }
      modifiedFiles[filename] = true;
      if (timer) {
        clearTimeout(timer);
      }
      // debounce a bit in case several files are changed at once
      timer = setTimeout(async () => {
        timer = null;
        const files = modifiedFiles;
        modifiedFiles = {};
        await fn(files);
      }, 250);
    });
  }

  async getBundlerOptions() {
    const opts = await super.getBundlerOptions();
    opts.logLevel = 2; // we don't want reports to be generated at all.
    return opts;
  }

  async run() {
    await this.validate();

    // start debugger (#178)
    // https://nodejs.org/en/docs/guides/debugging-getting-started/#enable-inspector
    process.kill(process.pid, 'SIGUSR1');

    this._project = new HelixProject()
      .withCwd(this._cwd)
      .withBuildDir(this._target)
      .withWebRootDir(this._webroot)
      .withDisplayVersion(pkgJson.version)
      .withRuntimeModulePaths(module.paths);

    if (this._httpPort >= 0) {
      this._project.withHttpPort(this._httpPort);
    }

    try {
      await this._project.init();
    } catch (e) {
      throw Error(`Unable to start helix: ${e.message}`);
    }

    let buildStartTime;
    let buildMessage;
    const onParcelBuildStart = async () => {
      if (this._project.started) {
        buildMessage = 'Rebuilding project files...';
      } else {
        buildMessage = 'Building project files...';
      }
      logger.info(buildMessage);
      buildStartTime = Date.now();
    };

    const onParcelBuildEnd = async () => {
      readline.clearLine(process.stdout, 0);
      readline.moveCursor(process.stdout, 0, -1);
      const buildTime = Date.now() - buildStartTime;
      logger.info(`${buildMessage}done ${buildTime}ms`);

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

    const onParcelBundled = async (bundle) => {
      // get the static files processed by parcel.
      await this.extractStaticFiles(bundle);
      await this.writeManifest();
    };

    const initBundler = async () => {
      // expand patterns from command line arguments and create parcel bundler
      const myfiles = this._files.reduce((a, f) => [...a, ...glob.sync(f)], []);
      this._bundler = await this.createBundler(myfiles);
      this._bundler.on('buildStart', onParcelBuildStart);
      this._bundler.on('buildEnd', onParcelBuildEnd);
      this._bundler.on('bundled', onParcelBundled);
    };

    this._initSourceWatcher(async (files) => {
      if (HELIX_CONFIG in files) {
        logger.info(`${HELIX_CONFIG} modified. Restarting dev server...`);
        await this._project.stop();
        await this._project.init();
        await this._project.start();
        if (Object.keys(files).length === 1) {
          return Promise.resolve();
        }
      }

      // recreate the bundler
      await initBundler();
      // this._bundler.entryAssets = null;
      // this._bundler.loadedAssets.clear();
      return this._bundler.bundle();
    });

    await initBundler();
    return this._bundler.bundle();
  }
}

module.exports = UpCommand;
