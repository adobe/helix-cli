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
const GitUrl = require('@adobe/petridish/src/GitUrl');

class GitUtils {
  static isDirty() {
    return $
      .exec('git status --porcelain', {
        silent: true,
      })
      .stdout.replace(/\n/g, '')
      .replace(/[\W]/g, '-').length;
  }

  static getBranch() {
    const rev = $
      .exec('git rev-parse HEAD', {
        silent: true,
      })
      .stdout.replace(/\n/g, '')
      .replace(/[\W]/g, '-');

    const tag = $
      .exec(`git name-rev --tags --name-only ${rev}`, {
        silent: true,
      })
      .stdout.replace(/\n/g, '')
      .replace(/[\W]/g, '-');

    const branchname = $
      .exec('git rev-parse --abbrev-ref HEAD', {
        silent: true,
      })
      .stdout.replace(/\n/g, '')
      .replace(/[\W]/g, '-');

    return tag !== 'undefined' ? tag : branchname;
  }


  static getBranchFlag() {
    return GitUtils.isDirty() ? 'dirty' : GitUtils.getBranch();
  }


  static getRepository() {
    const repo = GitUtils.getOrigin()
      .replace(/[\W]/g, '-');
    if (repo !== '') {
      return repo;
    }
    return `local--${path.basename(process.cwd())}`;
  }

  static getOrigin() {
    const origin = $.exec('git config --get remote.origin.url', {
      silent: true,
    }).stdout.replace(/\n/g, '');
    return origin;
  }

  static getOriginURL() {
    return new GitUrl(GitUtils.getOrigin());
  }

  static getCurrentRevision() {
    const rev = $
      .exec('git rev-parse HEAD', {
        silent: true,
      })
      .stdout.replace(/\n/g, '')
      .replace(/[\W]/g, '-');
    return rev;
  }
}

module.exports = GitUtils;
