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
const shell = require('shelljs');

/* eslint-disable no-console */

const LAYOUT_DEFAULT = {
  dir: path.resolve(__dirname, '../layouts/default'),
  files: [
    {
      name: 'README.md',
      filter: true,
      msg: 'created README.md with welcome message.',
    },
    {
      name: 'index.md',
      filter: true,
      msg: 'created index.md with sample content.',
    },
    {
      name: 'src/html.htl',
      filter: true,
      msg: 'created src/html.htl with minimal example.',
    },
    {
      name: 'src/html.pre.js',
      filter: true,
      msg: 'created src/html.pre.js with minimal example.',
    },
    {
      name: 'package.json',
      filter: true,
      msg: 'created package.json with sensible defaults and required dependencies.',
    },
    {
      name: 'helix-config.yaml',
      filter: true,
      msg: 'created helix-config.yaml for your convenience.',
    },
    {
      name: '.gitignore',
      from: '_gitignore',
    },
  ],
};

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

function msg(txt) {
  console.log(chalk.green('+ ') + txt);
}


async function initGitRepository(dir) {
  const pwd = shell.pwd();
  try {
    shell.cd(dir);
    await execAsync('git init -q');
    await execAsync('git add -A');
    await execAsync('git commit -q -m"Initial commit."');
    msg('initialized git repository.');
  } catch (e) {
    throw Error(`Unable to initialize git repository: ${e}`);
  } finally {
    shell.cd(pwd);
  }
}

async function initNpm(dir) {
  const pwd = shell.pwd();
  try {
    console.log(`${chalk.yellow('+')} running npm install...`);
    shell.cd(dir);
    await execAsync('npm install');
    msg('setup all npm dependencies.');
  } catch (e) {
    throw Error(`Unable to initialize nmp: ${e}`);
  } finally {
    shell.cd(pwd);
  }
}

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
    const relPath = path.relative(process.cwd(), projectDir);
    if (await fse.pathExists(projectDir)) {
      throw new Error(`cowardly rejecting to re-initialize project: ./${relPath}`);
    }

    try {
      await fse.ensureDir(projectDir);
    } catch (e) {
      throw new Error(`Unable to create project directory: ${e}`);
    }
    msg(`created ${relPath}`);


    const project = {
      name: this._name,
    };

    function processFile(srcFile, dstFile, filter) {
      if (filter) {
        return fse.readFile(srcFile, 'utf8').then((text) => {
          const result = text.replace(/{{\s*project\.name\s*}}/g, project.name);
          return fse.outputFile(dstFile, result);
        });
      }
      return fse.copy(srcFile, dstFile);
    }

    const jobs = LAYOUT_DEFAULT.files.map((f) => {
      const srcFile = path.resolve(LAYOUT_DEFAULT.dir, f.from || f.name);
      const dstFile = path.resolve(projectDir, f.name);
      return processFile(srcFile, dstFile, f.filter).then(() => {
        if (f.msg) {
          msg(f.msg);
        }
      });
    });

    return Promise.all(jobs)
      .then(() => initGitRepository(projectDir))
      .then(() => initNpm(projectDir))
      .then(() => {
        console.log(chalk.green(`Successfully created project in ./${relPath}`));
      })
      .catch((err) => {
        console.error(err);
        throw err;
      });
  }
}

module.exports = InitCommand;
