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

const opn = require('opn');
const readline = require('readline');
const chokidar = require('chokidar');
const chalk = require('chalk');
const { HelixProject } = require('@adobe/helix-simulator');
const BuildCommand = require('./build.cmd');
const pkgJson = require('../package.json');

const HELIX_CONFIG = 'helix-config.yaml';

class UpCommand extends BuildCommand {
  constructor(logger) {
    super(logger);
    this._httpPort = -1;
    this._open = false;
    this._strainName = '';
  }

  withHttpPort(p) {
    this._httpPort = p;
    return this;
  }

  withOpen(o) {
    this._open = !!o;
    return this;
  }

  // temporary solution until proper condition evaluation
  withStrainName(value) {
    this._strainName = value;
    return this;
  }

  get project() {
    return this._project;
  }

  async stop() {
    if (this._project) {
      await this._project.stop();
      this._project = null;
    }
    if (this._watcher) {
      await this._watcher.close();
      this._watcher = null;
    }
    this.log.info('Helix project stopped.');
    this.emit('stopped', this);
  }

  /**
   * Sets up the source file watcher.
   * @private
   */
  _initSourceWatcher(fn) {
    let timer = null;
    let modifiedFiles = {};

    this._watcher = chokidar.watch(['src', HELIX_CONFIG], {
      ignored: /(.*\.swx|.*\.swp|.*~)/,
      persistent: true,
      ignoreInitial: true,
      cwd: this.directory,
    });

    this._watcher.on('all', (eventType, file) => {
      modifiedFiles[file] = true;
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
    await super.init();

    if (!await this.config.hasFile()) {
      this.log.warn(chalk`No {cyan helix-config.yaml}. Please add one before deployment.`);
      this.log.info(chalk`You can auto generate one with\n{grey $ hlx up --save}\n`);
    }

    // start debugger (#178)
    // https://nodejs.org/en/docs/guides/debugging-getting-started/#enable-inspector
    process.kill(process.pid, 'SIGUSR1');
    this._project = new HelixProject()
      .withCwd(this.directory)
      .withBuildDir(this._target)
      .withWebRootDir(this._webroot)
      .withHelixConfig(this.config)
      .withStrainName(this._strainName || 'default')
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
    const onBuildStart = async () => {
      if (this._project.started) {
        buildMessage = 'Rebuilding project files...';
      } else {
        buildMessage = 'Building project files...';
      }
      this.log.info(buildMessage);
      buildStartTime = Date.now();
    };

    const onBuildEnd = async () => {
      try {
        readline.clearLine(process.stdout, 0);
        readline.moveCursor(process.stdout, 0, -1);
        const buildTime = Date.now() - buildStartTime;
        this.log.info(`${buildMessage}done ${buildTime}ms`);
        if (this._project.started) {
          this.emit('build', this);
          // todo
          // this._project.invalidateCache();
          return;
        }

        await this._project.start();
        this.emit('started', this);
        if (this._open) {
          opn(`http://localhost:${this._project.server.port}/`);
        }
      } catch (e) {
        this.log.error(`Internal error: ${e.message}`);
      }
    };

    this.on('buildStart', onBuildStart);
    this.on('buildEnd', onBuildEnd);

    this._initSourceWatcher(async (files) => {
      if (HELIX_CONFIG in files) {
        this.log.info(`${HELIX_CONFIG} modified. Restarting dev server...`);
        await this._project.stop();
        await this.reloadConfig();
        this._project.withHelixConfig(this.config);
        await this._project.init();
        await this._project.start();
        if (Object.keys(files).length === 1) {
          return Promise.resolve();
        }
      }
      return this.build();
    });

    this.build();
  }
}

module.exports = UpCommand;
