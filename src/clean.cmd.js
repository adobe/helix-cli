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

/* eslint-disable no-console */

const path = require('path');
const fse = require('fs-extra');
const chalk = require('chalk');

async function clean(dir) {
  if (!await fse.pathExists(dir)) {
    return;
  }
  try {
    await fse.remove(dir);
    console.log(`${chalk.green('ok:')} removed ${path.relative(process.cwd(), dir)}`);
  } catch (e) {
    console.error(`${chalk.red('error:')} unable to remove ${path.relative(process.cwd(), dir)}: ${e.message}`);
  }
}


class CleanCommand {
  constructor() {
    this._cwd = process.cwd();
    this._target = null;
    this._cacheDir = null;
  }

  withDirectory(dir) {
    this._cwd = dir;
    return this;
  }

  withTargetDir(target) {
    this._target = target;
    return this;
  }

  async run() {
    if (!this._target) {
      this._target = path.resolve(this._cwd, '.hlx', 'build');
    }
    if (!this._cacheDir) {
      this._cacheDir = path.resolve(this._cwd, '.hlx', 'cache');
    }

    await clean(this._target);
    await clean(this._cacheDir);
  }
}

module.exports = CleanCommand;
