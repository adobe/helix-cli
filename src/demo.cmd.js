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
const glob = require('glob');

const { getOrCreateLogger } = require('./log-common');

const ANSI_REGEXP = RegExp([
  '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007)',
  '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))',
].join('|'), 'g');

const FILENAME_MAPPING = {
  _gitignore: '.gitignore',
  _env: '.env',
};

function execAsync(cmd) {
  return new Promise((resolve, reject) => {
    shell.exec(cmd, (code, stdout, stderr) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(stderr);
      }
    });
  });
}

class DemoCommand {
  constructor(logger = getOrCreateLogger()) {
    this._logger = logger;
    this._name = '';
    this._dir = process.cwd();
    this._padding = 50;
    this._type = 'simple';
  }

  /**
   * Returns true if git is installed, otherwise false.
   */
  static gitInstalled() {
    return !!shell.which('git');
  }

  /**
   * Returns true if git `user.name` and `user.email` have been configured, otherwise false.
   */
  static gitConfigured() {
    return !!(shell.exec('git config --get user.name').stdout && shell.exec('git config --get user.email').stdout);
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

  withType(type) {
    this._type = type;
    return this;
  }

  msg(txt) {
    const dl = txt.length - txt.replace(ANSI_REGEXP, '').length;
    this._logger.info(txt.padEnd(this._padding + dl, ' ') + chalk.green('[ok]'));
  }

  async initGitRepository(dir) {
    const pwd = shell.pwd();
    try {
      shell.cd(dir);
      await execAsync('git init -q');
      await execAsync('git add -A');
      // https://github.com/adobe/helix-cli/issues/280
      // bypass pre-commit and commit-msg hooks when doing initial commit (-n,--no-verify)
      await execAsync('git commit -q -n -m"Initial commit."');
      this.msg(chalk.yellow('initializing git repository'));
    } catch (e) {
      throw Error(`Unable to initialize git repository: ${e}`);
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

    // git installed?
    if (!DemoCommand.gitInstalled()) {
      throw new Error(`
It seems like Git has not yet been installed on this system. 
See https://git-scm.com/book/en/v2/Getting-Started-Installing-Git for more information.
`);
    }

    // #181 cover edge case: make sure git is properly configured
    if (!DemoCommand.gitConfigured()) {
      throw new Error(`
It seems like Git has not yet been setup on this system. 
See https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup for more information.
`);
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
      if (srcFile.startsWith('/__enclose_io_memfs__/')) {
        // Temporary workaround for https://github.com/adobe/helix-cli/issues/654
        // see also https://github.com/adobe/node-packer/issues/1

        // When we're running inside the binary hlx executable (packaged helix-cli
        // with embedded node runtime):

        // avoid (directly or indirectly) calling fs.copyFile: it's not (yet)
        // supported by node-packer
        return fse.ensureDir(path.dirname(dstFile))
          .then(() => fse.readFile(srcFile))
          .then((content) => fse.writeFile(dstFile, content));
      }
      return fse.copy(srcFile, dstFile);
    }

    const root = path.resolve(__dirname, '..', 'demos', this._type);
    const jobs = glob.sync('**', {
      cwd: root,
      absolute: false,
      dot: true,
      nodir: true,
    }).map((f) => {
      const srcFile = path.resolve(root, f);
      const dstName = FILENAME_MAPPING[f] || f;
      const dstFile = path.resolve(projectDir, dstName);
      const filter = f === 'index.md' || f === 'README.md' || f === 'helix-config.yaml';
      return processFile(srcFile, dstFile, filter).then(() => {
        this.msg(`${msgCreating} ${msgRelPath}/${chalk.cyan(path.relative(projectDir, dstFile))}`);
      });
    });

    await Promise.all(jobs);
    await this.initGitRepository(projectDir);

    this._logger.info(chalk`
Project {cyan ${this._name}} initialized {green successfully} with a simple example.
For more examples, clone or fork one from http://github.com/adobe/project-helix/.

Next Step: start the development server and test the generated site with:
{grey $ cd ${this._name}}
{grey $ hlx up}`);
  }
}
module.exports = DemoCommand;
