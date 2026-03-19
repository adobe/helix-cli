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
import GitUtils from '../git-utils.js';
import { DaClient } from './da-api.js';
import { getValidToken } from './da-auth.js';

export const CONTENT_DIR = 'content';
export const CONFIG_FILE = '.da-config.json';
export const GIT_AUTHOR = { name: 'aem-cli', email: 'aem-cli@adobe.com' };

/**
 * Normalizes a da.live path: leading slash, no trailing slash except root.
 * @param {string} input
 * @returns {string}
 */
export function normalizeDaPath(input) {
  if (input === undefined || input === null) {
    throw new Error('Content path is required.');
  }
  let s = String(input).trim();
  if (s === '') {
    throw new Error('Content path cannot be empty.');
  }
  if (!s.startsWith('/')) {
    s = `/${s}`;
  }
  s = s.replace(/\/+$/, '') || '/';
  return s;
}

export default class CloneCommand {
  constructor(logger) {
    this.log = logger;
    this._dir = process.cwd();
    this._force = false;
    this._rootPath = null;
  }

  withDirectory(dir) {
    this._dir = dir;
    return this;
  }

  withToken(token) {
    this._token = token;
    return this;
  }

  withForce(force) {
    this._force = force;
    return this;
  }

  withRootPath(daPath) {
    this._rootPath = daPath;
    return this;
  }

  async run() {
    const { log } = this;

    if (this._rootPath == null) {
      throw new Error('Clone root path was not set (internal error).');
    }

    // 1. Resolve org/repo from git remote
    const originUrl = await GitUtils.getOriginURL(this._dir);
    if (!originUrl) {
      throw new Error('No git remote found. Run `aem content clone` inside an AEM project directory.');
    }
    const org = originUrl.owner;
    const { repo } = originUrl;
    log.info(`Cloning content from da.live: ${org}/${repo}${this._rootPath === '/' ? '' : ` @ ${this._rootPath}`}`);

    // 2. Resolve token
    const token = await getValidToken(log, this._token);

    // 3. Prepare content directory
    const contentDir = path.resolve(this._dir, CONTENT_DIR);
    if (await fse.pathExists(contentDir)) {
      if (!this._force) {
        throw new Error(`'${CONTENT_DIR}' already exists. Use --force to overwrite.`);
      }
      await fse.remove(contentDir);
    }
    await fse.ensureDir(contentDir);

    // 4. Fetch file list
    const client = new DaClient(token);
    log.info('Fetching file list...');
    const files = await client.listAll(org, repo, this._rootPath);
    log.info(`Found ${files.length} file(s). Downloading...`);

    // 5. Download files
    const downloaded = [];
    let errors = 0;

    for (const file of files) {
      const daPath = file.path.replace(`/${org}/${repo}`, '');
      const localPath = path.join(contentDir, ...daPath.split('/').filter(Boolean));
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await client.getSource(org, repo, daPath);
        if (!res) {
          log.warn(`  skip (not found): ${daPath}`);
          // eslint-disable-next-line no-continue
          continue;
        }
        // eslint-disable-next-line no-await-in-loop
        const buffer = Buffer.from(await res.arrayBuffer());
        // eslint-disable-next-line no-await-in-loop
        await fse.ensureDir(path.dirname(localPath));
        // eslint-disable-next-line no-await-in-loop
        await fse.writeFile(localPath, buffer);
        downloaded.push(daPath);
        log.info(`  ✓ ${daPath}`);
      } catch (err) {
        log.warn(`  ✗ ${daPath}: ${err.message}`);
        errors += 1;
      }
    }

    // 6. Init git repo and commit as baseline
    await git.init({ fs, dir: contentDir, defaultBranch: 'main' });
    await fse.writeFile(path.join(contentDir, '.gitignore'), `${CONFIG_FILE}\n`);
    for (const daPath of downloaded) {
      // eslint-disable-next-line no-await-in-loop
      await git.add({ fs, dir: contentDir, filepath: daPath.replace(/^\//, '') });
    }
    await git.add({ fs, dir: contentDir, filepath: '.gitignore' });
    await git.commit({
      fs,
      dir: contentDir,
      message: `clone: ${org}/${repo}${this._rootPath === '/' ? '' : ` (${this._rootPath})`}`,
      author: GIT_AUTHOR,
    });

    // 7. Write config (not tracked by git)
    await fse.writeJson(path.join(contentDir, CONFIG_FILE), {
      org,
      repo,
      rootPath: this._rootPath,
    }, { spaces: 2 });

    // 8. Add content/ to project .gitignore
    await this.ensureGitIgnored(CONTENT_DIR);

    log.info(`\nDone. ${downloaded.length} file(s) downloaded${errors > 0 ? `, ${errors} error(s)` : ''}.`);
    log.info(`Content saved to ./${CONTENT_DIR}/`);
  }

  async ensureGitIgnored(entry) {
    const gitIgnorePath = path.resolve(this._dir, '.gitignore');
    let content = '';
    if (await fse.pathExists(gitIgnorePath)) {
      content = await fse.readFile(gitIgnorePath, 'utf-8');
    }
    if (!content.split('\n').map((l) => l.trim()).includes(entry)) {
      await fse.appendFile(gitIgnorePath, `\n${entry}\n`);
      this.log.info(`Added '${entry}' to .gitignore`);
    }
  }
}
