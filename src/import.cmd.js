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
import GitUtils from './git-utils.js';
import { HelixImportProject } from './server/HelixImportProject.js';
import pkgJson from './package.cjs';
import { AbstractServerCommand } from './abstract-server.cmd.js';

export default class ImportCommand extends AbstractServerCommand {
  constructor(logger) {
    super(logger);
    this._importerSubPath = 'tools/importer';
    this._allowInsecure = true;
  }

  withAllowInsecure(value) {
    this._allowInsecure = value;
    return this;
  }

  withSkipUI(value) {
    this._skipUI = value;
    return this;
  }

  withUIRepo(value) {
    this._uiRepo = value;
    this._uiBranch = GitUtils.DEFAULT_BRANCH;
    if (value.includes('#')) {
      // eslint-disable-next-line prefer-destructuring
      this._uiRepo = value.split('#')[0];
      if (value.split('#')[1].length > 0) {
        // eslint-disable-next-line prefer-destructuring
        this._uiBranch = value.split('#')[1];
      }
    }
    return this;
  }

  withHeadersFile(value) {
    this._headersFile = value;
    return this;
  }

  /**
   * Ensure the UI branch the caller specified (or defaulted to) is the one being used.
   * @param uiFolder
   * @returns {Promise<void>}
   */
  async handleUIBranch(uiFolder) {
    let branch = GitUtils.DEFAULT_BRANCH;
    try {
      branch = await GitUtils.getBranch(uiFolder);

      if (branch !== this._uiBranch) {
        this.log.info(chalk`AEM Importer UI was on branch {yellow ${branch}}. Switching to {green ${this._uiBranch}}.`);
        // This checkout will produce an error if the uiBranch does not exist (or fails to switch),
        // will announce the error to the user, and exit the execution.
        // Error examples:
        // - "Your local changes to the following files would be overwritten by checkout: <file>"
        // - "Could not find bad-branch."
        await git.checkout({
          fs: fse,
          http,
          dir: uiFolder,
          ref: this._uiBranch,
        });
      }
    } catch (e) {
      // ignore
    }
  }

  async setupImporterUI() {
    const importerFolder = path.join(this.directory, this._importerSubPath);
    await fse.ensureDir(importerFolder);
    const uiProjectName = path.basename(this._uiRepo, '.git');
    const uiFolder = path.join(importerFolder, uiProjectName);
    await this.handleUIBranch(uiFolder);
    const getUIVersion = async () => ((await fse.readJson(path.resolve(uiFolder, 'package.json'))).version);
    const exists = await fse.pathExists(uiFolder);
    if (!exists) {
      this.log.info('AEM Importer UI needs to be installed.');
      this.log.info(`Cloning ${this._uiRepo} in ${importerFolder}.`);
      // clone the ui project
      await git.clone({
        fs: fse,
        http,
        dir: uiFolder,
        url: this._uiRepo,
        ref: this._uiBranch,
        depth: 1,
        singleBranch: true,
      });
      this.log.info(`AEM Importer UI is ready. v${await getUIVersion()} ${this._uiBranch ? `(Branch: ${this._uiBranch})` : ''}`);
    } else {
      this.log.info('Fetching latest version of the AEM Importer UI...');
      // clone the ui project
      await git.pull({
        fs: fse,
        http,
        dir: uiFolder,
        url: this._uiRepo,
        ref: this._uiBranch,
        depth: 1,
        singleBranch: true,
        author: {
          name: 'hlx import',
        },
      });
      this.log.info(`AEM Importer UI is up-to-date. v${await getUIVersion()} ${this._uiBranch
        ? `(Branch: ${this._uiBranch})` : ''}`);
    }
  }

  async init() {
    await super.init();

    // init dev default file params
    this._project = new HelixImportProject()
      .withCwd(this.directory)
      .withLogger(this._logger)
      .withKill(this._kill)
      .withAllowInsecure(this._allowInsecure)
      .withHeadersFile(this._headersFile);
    this.log.info(chalk`{yellow     ___    ________  ___                                __}`);
    this.log.info(chalk`{yellow    /   |  / ____/  |/  /  (_)___ ___  ____  ____  _____/ /____  _____}`);
    this.log.info(chalk`{yellow   / /| | / __/ / /|_/ /  / / __ \`__ \\/ __ \\/ __ \\/ ___/ __/ _ \\/ ___/}`);
    this.log.info(chalk`{yellow  / ___ |/ /___/ /  / /  / / / / / / / /_/ / /_/ / /  / /_/  __/ /}`);
    this.log.info(chalk`{yellow /_/  |_/_____/_/  /_/  /_/_/ /_/ /_/ .___/\\____/_/   \\__/\\___/_/}`);
    this.log.info(chalk`{yellow                                   /_/ v${pkgJson.version}}`);
    this.log.info('');

    await this.initServerOptions();

    if (!this._skipUI) {
      await this.setupImporterUI();
    }

    try {
      await this._project.init();
    } catch (e) {
      throw Error(`Unable to start AEM: ${e.message}`);
    }
  }
}
