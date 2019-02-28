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

const path = require('path');
const os = require('os');
const ignore = require('ignore');
const ini = require('ini');
const fse = require('fs-extra');

const { GitUrl } = require('@adobe/helix-shared');
const git = require('isomorphic-git');
git.plugins.set('fs', require('fs'));

class GitUtils {
  /**
   * Determines whether the working tree directory contains uncommitted or unstaged changes.
   *
   * @param {string} dir working tree directory path of the git repo
   * @param {string} [homedir] optional users home directory
   * @returns {Promise<boolean>} `true` if there are uncommitted/unstaged changes; otherwise `false`
   */
  static async isDirty(dir, homedir = os.homedir()) {
    // see https://isomorphic-git.org/docs/en/statusMatrix
    const HEAD = 1;
    const WORKDIR = 2;
    const STAGE = 3;
    const matrix = await git.statusMatrix({ dir });
    let modified = matrix
      .filter(row => !(row[HEAD] === row[WORKDIR] && row[WORKDIR] === row[STAGE]));
    if (modified.length === 0) {
      return false;
    }

    // need to re-check the modified against the globally ignored
    // see: https://github.com/isomorphic-git/isomorphic-git/issues/444
    const globalConfig = path.resolve(homedir, '.gitconfig');
    const config = ini.parse(await fse.readFile(globalConfig, 'utf-8'));
    const globalIgnore = path.resolve(homedir, (config.core && config.core.excludesfile) || '.gitignore_global');
    if (await fse.pathExists(globalIgnore)) {
      const ign = ignore()
        .add(await fse.readFile(globalIgnore, 'utf-8'));
      modified = modified.filter(row => !ign.ignores(row[0]));
      if (modified.length === 0) {
        return false;
      }
    }

    // filter out the deleted ones for the checks below
    const existing = modified.filter(row => row[WORKDIR] > 0).map(row => row[0]);
    if (existing.length < modified.length) {
      return true;
    }

    // we also need to filter out the non-files and non-symlinks.
    // see: https://github.com/isomorphic-git/isomorphic-git/issues/705
    const stats = await Promise.all(existing.map(file => fse.lstat(path.resolve(dir, file))));
    const files = stats.filter(stat => stat.isFile() || stat.isSymbolicLink());
    return files.length > 0;
  }

  /**
   * Returns the name of the current branch. If `HEAD` is at a tag, the name of the tag
   * will be returned instead.
   *
   * @param {string} dir working tree directory path of the git repo
   * @returns {Promise<string>} current branch or tag
   */
  static async getBranch(dir) {
    // current branch name
    const currentBranch = await git.currentBranch({ dir, fullname: false });
    // current commit sha
    const rev = await git.resolveRef({ dir, ref: 'HEAD' });
    // reverse-lookup tag from commit sha
    const allTags = await git.listTags({ dir });

    const tagCommitShas = await Promise.all(allTags.map(async (tag) => {
      const oid = await git.resolveRef({ dir, ref: tag });
      const obj = await git.readObject({ dir, oid });
      // annotated or lightweight tag?
      return obj.type === 'tag' ? {
        tag,
        sha: await git.resolveRef({ dir, ref: obj.object.object }),
      } : { tag, sha: oid };
    }));
    const tag = tagCommitShas.find(entry => entry.sha === rev);
    return typeof tag === 'object' ? tag.tag : currentBranch;
  }

  /**
   * Returns `dirty` if the working tree directory contains uncommitted/unstaged changes.
   * Otherwise returns the encoded (any non word character replaced by `-`)
   * current branch or tag.
   *
   * @param {string} dir working tree directory path of the git repo
   * @returns {Promise<string>} `dirty` or encoded current branch/tag
  */
  static async getBranchFlag(dir) {
    const dirty = await GitUtils.isDirty(dir);
    const branch = await GitUtils.getBranch(dir);
    return dirty ? 'dirty' : branch.replace(/[\W]/g, '-');
  }

  /**
   * Returns the encoded (any non word character replaced by `-`) `origin` remote url.
   * If no `origin` remote url is defined `local--<basename of current working dir>`
   * will be returned instead.
   *
   * @param {string} dir working tree directory path of the git repo
   * @returns {Promise<string>} `dirty` or encoded current branch/tag
   */
  static async getRepository(dir) {
    const repo = (await GitUtils.getOrigin(dir))
      .replace(/[\W]/g, '-');
    return repo !== '' ? repo : `local--${path.basename(process.cwd())}`;
  }

  /**
   * Returns the `origin` remote url or `''` if none is defined.
   *
   * @param {string} dir working tree directory path of the git repo
   * @returns {Promise<string>} `origin` remote url
   */
  static async getOrigin(dir) {
    const rmt = (await git.listRemotes({ dir })).find(entry => entry.remote === 'origin');
    return typeof rmt === 'object' ? rmt.url : '';
  }

  /**
   * Same as #getOrigin()but returns a `GitUrl` instance instead of a string.
   *
   * @param {string} dir working tree directory path of the git repo
   * @returns {Promise<GitUrl>} `origin` remote url
   */
  static async getOriginURL(dir) {
    return new GitUrl(await GitUtils.getOrigin(dir));
  }

  /**
   * Returns the sha of the current (i.e. `HEAD`) commit.
   *
   * @param {string} dir working tree directory path of the git repo
   * @returns {Promise<string>} sha of the current (i.e. `HEAD`) commit
   */
  static async getCurrentRevision(dir) {
    return git.resolveRef({ dir, ref: 'HEAD' });
  }
}

module.exports = GitUtils;
