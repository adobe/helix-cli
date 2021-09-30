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
const fse = require('fs-extra');
const opn = require('open');
const chalk = require('chalk');
const HelixProject = require('./server/HelixProject.js');
const GitUtils = require('./git-utils.js');
const AbstractCommand = require('./abstract.cmd');
const pkgJson = require('../package.json');

class UpCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._httpPort = -1;
    this._open = '/';
    this._liveReload = false;
    this._pagesUrl = null;
  }

  withHttpPort(p) {
    this._httpPort = p;
    return this;
  }

  withOpen(o) {
    this._open = o === 'false' ? false : o;
    return this;
  }

  withLiveReload(value) {
    this._liveReload = value;
    return this;
  }

  withPagesUrl(value) {
    this._pagesUrl = value;
    return this;
  }

  get project() {
    return this._project;
  }

  async stop() {
    if (this._watcher) {
      await this._watcher.close();
      this._watcher = null;
    }
    if (this._project) {
      try {
        await this._project.stop();
      } catch (e) {
        // ignore
      }
      this._project = null;
    }
    this.log.info('Helix project stopped.');
    this.emit('stopped', this);
  }

  async setup() {
    await super.init();
    // check for git repository
    try {
      const stat = await fse.lstat(path.resolve(this.directory, '.git'));
      if (stat.isFile()) {
        throw Error('git submodules are not supported.');
      }
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw Error('hlx up needs local git repository.');
      }
      throw e;
    }

    // init dev default file params
    this._project = new HelixProject()
      .withCwd(this.directory)
      .withLiveReload(this._liveReload);

    this.log.info(chalk.yellow('    __ __    ___       ___                  '));
    this.log.info(chalk.yellow('   / // /__ / (_)_ __ / _ \\___ ____ ____ ___'));
    this.log.info(chalk.yellow('  / _  / -_) / /\\ \\ // ___/ _ `/ _ `/ -_|_-<'));
    this.log.info(chalk.yellow(' /_//_/\\__/_/_//_\\_\\/_/   \\_,_/\\_, /\\__/___/'));
    this.log.info(chalk.yellow(`                              /___/ v${pkgJson.version}`));
    this.log.info('');

    const gitUrl = await GitUtils.getOriginURL(this.directory);
    const ref = await GitUtils.getBranch(this.directory);
    if (!this._pagesUrl) {
      this._pagesUrl = `https://${ref}--${gitUrl.repo}--${gitUrl.owner}.hlx3.page`;
    }

    this._project.withProxyUrl(this._pagesUrl);
    if (this._httpPort >= 0) {
      this._project.withHttpPort(this._httpPort);
    }

    try {
      await this._project.init();
    } catch (e) {
      throw Error(`Unable to start helix: ${e.message}`);
    }
  }

  async run() {
    await this.setup();
    await this._project.start();
    this.emit('started', this);
    if (this._open) {
      const url = this._open.startsWith('/')
        ? `http://localhost:${this._project.server.port}${this._open}`
        : this._open;
      opn(url, { url: true });
    }
  }
}

module.exports = UpCommand;
