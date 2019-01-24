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

const path = require('path');
const readline = require('readline');
const opn = require('opn');
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
    this._saveConfig = false;
  }

  withHttpPort(p) {
    this._httpPort = p;
    return this;
  }

  withOpen(o) {
    this._open = !!o;
    return this;
  }

  withSaveConfig(value) {
    this._saveConfig = value;
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

    // if no config is defined, we use the `dev` strain to ensure localhost as git server
    let hasConfigFile = await this.config.hasFile();
    if (!hasConfigFile) {
      this._strainName = 'dev';
    }
    if (this._saveConfig) {
      if (hasConfigFile) {
        this.log.warn(chalk`Cowardly refusing to overwrite existing {cyan helix-config.yaml}.`);
      } else {
        await this.config.saveConfig();
        this.log.info(chalk`Wrote new default config to {cyan ${path.relative(process.cwd(), this.config.configPath)}}.`);
        hasConfigFile = true;
      }
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
        if (!hasConfigFile) {
          this.log.info(chalk`{green Note:} 
The project does not have a {cyan helix-config.yaml} which is necessary to 
access remote content and to deploy helix. Consider running 
{gray hlx up --save-config} to generate a default config.`);
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
