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

/* eslint no-console: off */

const $ = require('shelljs');
const path = require('path');
const { GitUrl } = require('@adobe/helix-shared');
const git = require('isomorphic-git');
git.plugins.set('fs', require('fs'));

function runIn(dir, fn) {
  const pwd = $.pwd();
  try {
    if (dir) {
      $.cd(dir);
    }
    return fn();
  } finally {
    if (dir) {
      $.cd(pwd);
    }
  }
}

class GitUtils {
  static async isDirty(dir) {
    // see https://isomorphic-git.org/docs/en/statusMatrix
    const HEAD = 1;
    const WORKDIR = 2;
    const STAGE = 3;
    const matrix = await git.statusMatrix({ dir });
    return matrix
      .filter(row => !(row[HEAD] === row[WORKDIR] && row[WORKDIR] === row[STAGE]))
      .length !== 0;
  }

  static getBranch(dir) {
    return runIn(dir, () => {
      const rev = $
        .exec('git rev-parse HEAD', {
          silent: true,
        })
        .stdout.replace(/\n/g, '');

      const tag = $
        .exec(`git name-rev --tags --name-only ${rev}`, {
          silent: true,
        })
        .stdout.replace(/\n/g, '');

      const branchname = $
        .exec('git rev-parse --abbrev-ref HEAD', {
          silent: true,
        })
        .stdout.replace(/\n/g, '');

      return tag !== 'undefined' ? tag : branchname;
    });
  }

  static async getBranchFlag(dir) {
    const dirty = await GitUtils.isDirty(dir);
    return dirty ? 'dirty' : GitUtils.getBranch(dir).replace(/[\W]/g, '-');
  }

  static getRepository(dir) {
    return runIn(dir, () => {
      const repo = GitUtils.getOrigin()
        .replace(/[\W]/g, '-');
      if (repo !== '') {
        return repo;
      }
      return `local--${path.basename(process.cwd())}`;
    });
  }

  static getOrigin(dir) {
    return runIn(dir, () => {
      try {
        const origin = $.exec('git config --get remote.origin.url', {
          silent: true,
        }).stdout.replace(/\n/g, '');
        return origin;
      } catch (e) {
        return '';
      }
    });
  }

  static getOriginURL(dir) {
    return new GitUrl(GitUtils.getOrigin(dir));
  }

  static getCurrentRevision(dir) {
    return runIn(dir, () => {
      const rev = $
        .exec('git rev-parse HEAD', {
          silent: true,
        })
        .stdout.replace(/\n/g, '')
        .replace(/[\W]/g, '-');
      return rev;
    });
  }
}

module.exports = GitUtils;
