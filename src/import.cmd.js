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
import chalk from 'chalk-template';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node/index.js';
import { HelixImportProject } from './server/HelixImportProject.js';
import pkgJson from './package.cjs';
import { AbstractServerCommand } from './abstract-server.cmd.js';

export default class ImportCommand extends AbstractServerCommand {
  constructor(logger) {
    super(logger);
    this._importerSubPath = 'tools/importer';
  }

  withSkipUI(value) {
    this._skipUI = value;
    return this;
  }

  withUIRepo(value) {
    this._uiRepo = value;
    return this;
  }

  async setupImporterUI() {
    const importerFolder = path.join(this.directory, this._importerSubPath);
    await fse.ensureDir(importerFolder);
    const uiProjectName = path.basename(this._uiRepo, '.git');
    const uiFolder = path.join(importerFolder, uiProjectName);
    const exists = await fse.pathExists(uiFolder);
    if (!exists) {
      this.log.info('Franklin Importer UI needs to be installed.');
      this.log.info(`Cloning ${this._uiRepo} in ${importerFolder}.`);
      // clone the ui project
      await git.clone({
        fs: fse,
        http,
        dir: uiFolder,
        url: this._uiRepo,
        depth: 1,
        singleBranch: true,
      });
      this.log.info('Franklin Importer UI is ready.');
    } else {
      this.log.info('Fetching latest version of the Franklin Import UI.');
      // clone the ui project
      await git.pull({
        fs: fse,
        http,
        dir: uiFolder,
        url: this._uiRepo,
        depth: 1,
        singleBranch: true,
        author: {
          name: 'hlx import',
        },
      });
      this.log.info('Franklin Importer UI is now up-to-date.');
    }
  }

  async init() {
    await super.init();

    // init dev default file params
    this._project = new HelixImportProject()
      .withCwd(this.directory)
      .withLogger(this._logger)
      .withKill(this._kill);

    this.log.info(chalk`{yellow     ____              __    ___      ____                    __}`);
    this.log.info(chalk`{yellow    / __/______ ____  / /__ / (_)__  /  _/_ _  ___  ___  ____/ /_}`);
    this.log.info(chalk`{yellow   / _// __/ _ \`/ _ \\/  '_// / / _ \\_/ //  ' \\/ _ \\/ _ \\/ __/ __/}`);
    this.log.info(chalk`{yellow  /_/ /_/  \\_,_/_//_/_/\\_\\/_/_/_//_/___/_/_/_/ .__/\\___/_/  \\__/}`);
    this.log.info(chalk`{yellow                                            /_/  v${pkgJson.version}}`);
    this.log.info('');

    if (this._cache) {
      await fse.ensureDir(this._cache);
      this._project.withCacheDirectory(this._cache);
    }

    if (this._httpPort >= 0) {
      this._project.withHttpPort(this._httpPort);
    }
    if (this._bindAddr) {
      this._project.withBindAddr(this._bindAddr);
    }

    if (!this._skipUI) {
      await this.setupImporterUI();
    }

    try {
      await this._project.init();
    } catch (e) {
      throw Error(`Unable to start Franklin: ${e.message}`);
    }
  }
}
