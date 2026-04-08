/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import git from 'isomorphic-git';
import { stageDeletionsForContentAddScopes } from '../../src/content/add.cmd.js';
import { CONTENT_DIR } from '../../src/content/content-shared.js';

export const GIT_AUTHOR = { name: 'aem-cli', email: 'aem-cli@adobe.com' };

export function makeLogger() {
  const logs = [];
  return {
    info: (msg) => logs.push({ level: 'info', msg }),
    warn: (msg) => logs.push({ level: 'warn', msg }),
    error: (msg) => logs.push({ level: 'error', msg }),
    logs,
  };
}

/**
 * Creates a content dir with a baseline git commit.
 * Writes .da-config.json (not tracked).
 */
export async function setupContentDir(baseDir, org = 'myorg', repo = 'myrepo') {
  const contentDir = path.join(baseDir, CONTENT_DIR);
  await fse.ensureDir(path.join(contentDir, 'blog'));

  await fse.writeFile(path.join(contentDir, 'blog', 'post.html'), '<html><p>original</p></html>');
  await fse.writeFile(path.join(contentDir, 'index.html'), '<html><p>index</p></html>');
  await fse.writeFile(path.join(contentDir, '.gitignore'), '.da-config.json\n');

  await git.init({ fs, dir: contentDir, defaultBranch: 'main' });
  await git.add({ fs, dir: contentDir, filepath: 'blog/post.html' });
  await git.add({ fs, dir: contentDir, filepath: 'index.html' });
  await git.add({ fs, dir: contentDir, filepath: '.gitignore' });
  await git.commit({
    fs,
    dir: contentDir,
    message: `clone: ${org}/${repo}`,
    author: GIT_AUTHOR,
  });

  await fse.writeJson(path.join(contentDir, '.da-config.json'), { org, repo }, { spaces: 2 });

  return contentDir;
}

/**
 * Stage all paths and create a commit (for tests that exercise push after edits).
 * @param {string} contentDir
 * @param {string} message
 */
export async function stageAllAndCommit(contentDir, message) {
  await git.add({ fs, dir: contentDir, filepath: '.' });
  await stageDeletionsForContentAddScopes(fs, contentDir, ['.']);
  await git.commit({
    fs,
    dir: contentDir,
    message,
    author: GIT_AUTHOR,
  });
}

/**
 * Returns a constructor function (not a class) for a configurable DaClient mock.
 * @param {object} opts
 * @param {Array}   opts.files           files returned by listAll
 * @param {string}  opts.sourceContent   content returned by getSource (null = 404)
 * @param {number}  opts.remoteLastModified lastModified returned by getRemoteLastModified
 * @param {boolean} opts.putFails        if true, putSource throws
 * @param {boolean} opts.deleteFails     if true, deleteSource throws
 * @param {Function} opts.onPut         called with (daPath) when putSource is called
 * @param {Function} opts.onDelete      called with (daPath) when deleteSource is called
 */
export function createDaClientClass(opts = {}) {
  function DaClientMock(token) {
    this.token = token;
  }

  DaClientMock.prototype.listAll = async function listAll(org, repo, daPath, onDiscovered) {
    if (opts.onListAll) {
      opts.onListAll(org, repo, daPath);
    }
    const files = opts.files || [];
    if (onDiscovered) {
      let n = 0;
      for (const item of files) {
        if (item.ext !== undefined) {
          n += 1;
          onDiscovered(n);
        }
      }
    }
    return files;
  };

  DaClientMock.prototype.getSource = async function getSource() {
    const content = opts.sourceContent !== undefined ? opts.sourceContent : '<html>remote</html>';
    if (content === null) {
      return null;
    }
    return {
      buffer: async () => Buffer.from(content),
      arrayBuffer: async () => Buffer.from(content),
      text: async () => content,
    };
  };

  DaClientMock.prototype.getRemoteLastModified = async function getRemoteLastModified() {
    return opts.remoteLastModified !== undefined ? opts.remoteLastModified : null;
  };

  DaClientMock.prototype.putSource = async function putSource(org, repo, daPath) {
    if (opts.putFails) {
      throw new Error(`PUT failed for ${daPath}`);
    }
    if (opts.onPut) {
      opts.onPut(daPath);
    }
    return {};
  };

  DaClientMock.prototype.deleteSource = async function deleteSource(org, repo, daPath) {
    if (opts.deleteFails) {
      throw new Error(`DELETE failed for ${daPath}`);
    }
    if (opts.onDelete) {
      opts.onDelete(daPath);
    }
    return true;
  };

  return DaClientMock;
}
