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

const ANSI_REGEXP = RegExp([
  '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007)',
  '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))',
].join('|'), 'g');

/* eslint-disable no-console */

const LAYOUT_DEFAULT = {
  dir: path.resolve(__dirname, '../layouts/default'),
  files: [
    {
      name: 'helix_logo.png',
    },
    {
      name: 'index.md',
      filter: true,
    },
    {
      name: 'src/html.htl',
      filter: true,
    },
    {
      name: 'src/html.pre.js',
      filter: true,
    },
    {
      name: 'src/static/favicon.ico',
    },
    {
      name: 'src/static/style.css',
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

class InitCommand {
  constructor() {
    this._name = '';
    this._dir = process.cwd();
    this._padding = 50;
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

  msg(txt) {
    const dl = txt.length - txt.replace(ANSI_REGEXP, '').length;
    console.log('%s', txt.padEnd(this._padding + dl, ' ') + chalk.green('[ok]'));
  }

  async initGitRepository(dir) {
    const pwd = shell.pwd();
    try {
      shell.cd(dir);
      await execAsync('git init -q');
      await execAsync('git add -A');
      await execAsync('git commit -q -m"Initial commit."');
      this.msg(chalk.yellow('initializing git repository'));
    } catch (e) {
      throw Error(`Unable to initialize git repository: ${e}`);
    } finally {
      shell.cd(pwd);
    }
  }

  async initNpm(dir) {
    const pwd = shell.pwd();
    try {
      console.log(`${chalk.yellow('+')} running npm install...`);
      shell.cd(dir);
      await execAsync('npm install');
      this.msg('setup all npm dependencies.');
    } catch (e) {
      throw Error(`Unable to initialize nmp: ${e}`);
    } finally {
      shell.cd(pwd);
    }
  }

  async run() {
    if (!this._name) {
      throw new Error('init needs name.');
    }
    if (!this._dir) {
      throw new Error('init needs directory.');
    }

    this._padding = this._name.length + 45;
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

    const msgCreating = chalk.yellow('creating');
    const msgRelPath = chalk.gray(relPath);
    this.msg(`${msgCreating} ${msgRelPath}`);

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
        this.msg(`${msgCreating} ${msgRelPath}/${chalk.cyan(f.name)}`);
      });
    });

    await Promise.all(jobs);
    // await this.initNpm(projectDir);
    await this.initGitRepository(projectDir);

    console.log(chalk`
Project {cyan ${this._name}} initialized {green successfully} with a simple example.
For more examples, clone or fork one from http://github.com/adobe/project-helix/.

Next Step: start the development server and test the generated site with:
{grey $ cd ${this._name}}
{grey $ hlx up}`);
  }
}

module.exports = InitCommand;
