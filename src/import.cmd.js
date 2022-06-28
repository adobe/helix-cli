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
import path from 'path';
import opn from 'open';
import chalk from 'chalk-template';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node/index.js';
import HelixImportProject from './server/HelixImportProject.js';
import pkgJson from './package.cjs';
import AbstractCommand from './abstract.cmd.js';

export default class ImportCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._httpPort = -1;
    this._importerSubPath = 'tools/importer';
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

  withSkipUI(value) {
    this._skipUI = value;
    return this;
  }

  withUIRepo(value) {
    this._uiRepo = value;
    return this;
  }

  get project() {
    return this._project;
  }

  async stop() {
    if (this._project) {
      try {
        await this._project.stop();
      // codecov:ignore:start
      /* c8 ignore start */
      } catch (e) {
        // ignore
      }
      // codecov:ignore:end
      /* c8 ignore end */
      this._project = null;
    }
    this.log.info('Helix project stopped.');
    this.emit('stopped', this);
  }

  async setupImporterUI() {
    const importerFolder = path.join(this.directory, this._importerSubPath);
    await fse.ensureDir(importerFolder);
    const uiProjectName = path.basename(this._uiRepo, '.git');
    const uiFolder = path.join(importerFolder, uiProjectName);
    const exists = await fse.pathExists(uiFolder);
    if (!exists) {
      this.log.info('Helix Importer UI needs to be installed.');
      this.log.info(`Cloning ${this._uiRepo} in ${importerFolder}.`);
      // clone the ui project
      await git.clone({
        fs: fse,
        http,
        dir: uiFolder,
        url: this._uiRepo,
        ref: 'main',
        depth: 1,
        singleBranch: true,
      });
      this.log.info('Helix Importer UI is ready.');
    } else {
      this.log.info('Fetching latest version of the Helix Import UI.');
      // clone the ui project
      await git.fetch({
        fs: fse,
        http,
        dir: uiFolder,
        url: this._uiRepo,
        ref: 'main',
        depth: 1,
        singleBranch: true,
      });
      this.log.info('Helix Importer UI is now up-to-date.');
    }
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

    if (!this._skipUI) {
      await this.setupImporterUI();
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
