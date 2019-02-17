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
const { GitUrl } = require('@adobe/helix-shared');
const git = require('isomorphic-git');
git.plugins.set('fs', require('fs'));

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

  static async getBranchFlag(dir) {
    const dirty = await GitUtils.isDirty(dir);
    const branch = await GitUtils.getBranch(dir);
    return dirty ? 'dirty' : branch.replace(/[\W]/g, '-');
  }

  static async getRepository(dir) {
    const repo = (await GitUtils.getOrigin(dir))
      .replace(/[\W]/g, '-');
    return repo !== '' ? repo : `local--${path.basename(process.cwd())}`;
  }

  static async getOrigin(dir) {
    const rmt = (await git.listRemotes({ dir })).find(entry => entry.remote === 'origin');
    return typeof rmt === 'object' ? rmt.url : '';
  }

  static async getOriginURL(dir) {
    return new GitUrl(await GitUtils.getOrigin(dir));
  }

  static async getCurrentRevision(dir) {
    return git.resolveRef({ dir, ref: 'HEAD' });
  }
}

module.exports = GitUtils;
