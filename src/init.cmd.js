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

const path = require('path');
const fse = require('fs-extra');
const chalk = require('chalk');

/* eslint-disable no-console */

class InitCommand {
  constructor() {
    this._name = '';
    this._dir = process.cwd();
  }

  withName(name) {
    this._name = name;
    return this;
  }

  withDirectory(dir) {
    if (dir) {
      this._dir = dir;
    }
    return this;
  }

  async run() {
    if (!this._name) {
      throw new Error('init needs name.');
    }
    if (!this._dir) {
      throw new Error('init needs directory.');
    }

    const projectDir = path.resolve(path.join(this._dir, this._name));

    console.log(chalk.green('Init'), this._name, this._dir);

    try {
      await fse.ensureDir(projectDir);
    } catch (e) {
      throw new Error(`Unable to create project directory: ${e}`);
    }

    // TODO: implement
    console.log(chalk.green(`Successfully created project in ${projectDir}`));
  }
}

module.exports = InitCommand;
