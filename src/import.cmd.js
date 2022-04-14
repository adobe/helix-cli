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
import fse from 'fs-extra';
import opn from 'open';
import chalk from 'chalk-template';
import HelixImportProject from './server/HelixImportProject.js';
import pkgJson from './package.cjs';
import AbstractCommand from './abstract.cmd.js';

export default class ImportCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._httpPort = -1;
    this._open = '/tools/importer/helix-webui-importer/index.html';
    this._cache = null;
  }

  withHttpPort(p) {
    this._httpPort = p;
    return this;
  }

  withOpen(o) {
    this._open = o === 'false' ? false : o;
    return this;
  }

  withCache(value) {
    this._cache = value;
    return this;
  }

  withKill(value) {
    this._kill = value;
    return this;
  }

  get project() {
    return this._project;
  }

  async stop() {
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

    // init dev default file params
    this._project = new HelixImportProject()
      .withCwd(this.directory)
      .withLogger(this._logger)
      .withKill(this._kill);

    this.log.info(chalk`{yellow     __ __    ___       ___                  }`);
    this.log.info(chalk`{yellow    / // /__ / (_)_ __ / _ \\___ ____ ____ ___}`);
    this.log.info(chalk`{yellow   / _  / -_) / /\\ \\ // ___/ _ \`/ _ \`/ -_|_-<}`);
    this.log.info(chalk`{yellow  /_//_/\\__/_/_//_\\_\\/_/   \\_,_/\\_, /\\__/___/}`);
    this.log.info(chalk`{yellow                               /___/ v${pkgJson.version}} - import mode`);
    this.log.info('');

    if (this._cache) {
      await fse.ensureDir(this._cache);
      this._project.withCacheDirectory(this._cache);
    }

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
