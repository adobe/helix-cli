/*
 * Copyright 2019 Adobe. All rights reserved.
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
const shell = require('shelljs');
const chalk = require('chalk');
const { GitUrl } = require('@adobe/helix-shared');

function execAsync(cmd) {
  return new Promise((resolve, reject) => {
    shell.exec(cmd, (code, stdout, stderr) => {
      if (code === 0) {
        resolve(0);
      } else {
        reject(stderr);
      }
    });
  });
}

/**
 * Utilities for helix pages
 */
class HelixPages {
  constructor(logger) {
    this._logger = logger;
    this._cwd = process.cwd();
    this._repo = 'https://github.com/adobe/helix-pages.git';
    this._ref = 'master';
  }

  withDirectory(value) {
    this._cwd = value;
    return this;
  }

  withRepo(value) {
    this._repo = value;
  }

  get log() {
    return this._logger;
  }

  get directory() {
    return this._cwd;
  }

  get homeDirectory() {
    return this._homeDirectory;
  }

  get srcDirectory() {
    return this._srcDirectory;
  }

  get checkoutDirectory() {
    return this._checkoutDir;
  }

  get staticURL() {
    return this._staticURL;
  }

  async isPagesProject() {
    return !await fse.pathExists(path.join(this.directory, 'src'));
  }

  async init() {
    // check if helix-pages checkout exists
    // todo: add support to check for updates and  version control
    this._homeDirectory = path.resolve(this.directory, '.hlx', 'pages');
    this._checkoutDir = path.resolve(this.homeDirectory, this._ref);
    this._srcDirectory = path.resolve(this.checkoutDirectory, 'src');
    this._staticURL = new GitUrl('https://github.com/adobe/helix-pages.git/htdocs');

    if (!await fse.pathExists(this.checkoutDirectory)) {
      this.log.info(chalk`Checking out sources from {cyan ${this._repo}#${this._ref}}`);
      try {
        await execAsync(`git clone --branch ${this._ref} --quiet --depth 1 ${this._repo} ${this.checkoutDirectory}`);
      } catch (e) {
        throw Error(`Unable to checkout helix-pages repository: ${e}`);
      }

      const pagesPackageJson = path.resolve(this.checkoutDirectory, 'package.json');
      if (await fse.pathExists(pagesPackageJson)) {
        const pkgJson = await fse.readJson(pagesPackageJson);
        this.log.info(chalk`Running {gray npm install} for {yellow ${pkgJson.name}@${pkgJson.version}}...`);
        const cwd = process.cwd();
        try {
          shell.cd(this.checkoutDirectory);
          await execAsync('npm install --only=prod --ignore-scripts --no-bin-links --no-audit');
        } catch (e) {
          throw Error(`Unable to install helix-pages dependencies: ${e}`);
        } finally {
          shell.cd(cwd);
        }
      }
    }
  }
}

module.exports = HelixPages;
