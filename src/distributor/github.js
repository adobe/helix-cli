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

const fs = require('fs-extra');
const path = require('path');
const shell = require('shelljs');

async function exec(cmd) {
  // todo: promisify
  const proc = shell.exec(cmd);
  if (proc.code !== 0) {
    throw Error(`Unable to exec ${cmd}.`);
  }
  return proc.stdout.trim();
}

class GithubDistributor {
  constructor() {
    this._helixDir = null;
    this._distDir = null;
    this._prefix = null;
    this._tmpDir = null;
    this._branch = 'helix-static';
    this._repo = null;
    this._commitId = null;
  }

  withHelixDir(value) {
    this._helixDir = value;
    return this;
  }

  withDistDir(value) {
    this._distDir = value;
    return this;
  }

  withPrefix(value) {
    this._prefix = value;
    return this;
  }

  withRepo(value) {
    this._repo = value;
    return this;
  }

  async init() {
    if (!this._helixDir) {
      this._helixDir = path.resolve(process.cwd(), '.hlx');
    }
    if (!this._distDir) {
      this._distDir = path.resolve(this._helixDir, 'dist');
    }
    this._tmpDir = path.resolve(this._helixDir, 'tmp', 'gh-static', this._prefix);
    await fs.ensureDir(this._tmpDir);

    if (!this._repo) {
      this._repo = await exec('git remote get-url origin');
    }
  }

  async run() {
    await this.init();

    // check if branch is already checked out
    if (await fs.pathExists(path.resolve(this._tmpDir, '.git'))) {
      await exec(`git -C ${this._tmpDir} pull`);
    } else {
      await fs.ensureDir(this._tmpDir);
      await exec(`git init ${this._tmpDir}`);
      await exec(`git -C ${this._tmpDir} checkout --orphan ${this._branch}`);
      await exec(`git -C ${this._tmpDir} remote add -t ${this._branch} origin ${this._repo}`);

      if (shell.exec(`git -C ${this._tmpDir} pull`).code !== 0) {
        // assume remote ref doesn't exist
        await exec(`git -C ${this._tmpDir} commit -m"initializing static branch" --allow-empty`);
        await exec(`git -C ${this._tmpDir} push --set-upstream origin ${this._branch}`);
      }
    }

    await fs.copy(this._distDir, this._tmpDir, {
      preserveTimestamps: true,
      dereference: true,
    });

    // todo: remove files no longer needed
    await exec(`git -C ${this._tmpDir} add -A`);

    const st = await exec(`git -C ${this._tmpDir} status --porcelain`);
    if (st !== '') {
      // todo: better commit message
      await exec(`git -C ${this._tmpDir} commit -m"updating static files."`);
    }
    await exec(`git -C ${this._tmpDir} push --set-upstream origin ${this._branch}`);

    const head = await exec(`git -C ${this._tmpDir} rev-parse origin/${this._branch}`);
    // eslint-disable-next-line no-console
    console.log(`Deployed static files to ${this._repo}/${head}`);
    return head;
  }
}

module.exports = GithubDistributor;
