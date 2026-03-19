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
import readline from 'readline';
import path from 'path';
import fse from 'fs-extra';
import git from 'isomorphic-git';
import GitUtils from '../git-utils.js';
import { prompt } from '../cli-util.js';
import { DaClient } from './da-api.js';
import { getValidToken } from './da-auth.js';

export const CONTENT_DIR = 'content';
/** Above this count, the user is warned and must confirm (or pass --yes). */
export const LARGE_CLONE_FILE_THRESHOLD = 10000;
export const CONFIG_FILE = '.da-config.json';
export const GIT_AUTHOR = { name: 'aem-cli', email: 'aem-cli@adobe.com' };

const DOWNLOAD_CONCURRENCY = 10;

/**
 * Runs async mapper over items with at most `limit` in flight. Preserves result order.
 * @template T, R
 * @param {T[]} array
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} mapper
 * @returns {Promise<R[]>}
 */
async function mapWithConcurrency(array, limit, mapper) {
  if (array.length === 0) {
    return [];
  }
  const results = new Array(array.length);
  let next = 0;
  async function worker() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const i = next;
      next += 1;
      if (i >= array.length) {
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      results[i] = await mapper(array[i], i);
    }
  }
  const pool = Math.min(limit, array.length);
  await Promise.all(Array.from({ length: pool }, () => worker()));
  return results;
}

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

/**
 * @param {*} log logger with .warn
 * @param {number} fileCount
 * @param {boolean} assumeYes
 */
async function confirmLargeCloneIfNeeded(log, fileCount, assumeYes) {
  if (fileCount <= LARGE_CLONE_FILE_THRESHOLD) {
    return;
  }
  log.warn(
    `This clone lists ${fileCount} files (more than ${LARGE_CLONE_FILE_THRESHOLD.toLocaleString()}). `
    + 'Downloading may take a long time and use substantial disk space.',
  );
  if (assumeYes) {
    return;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      `Large clone (${fileCount} files) needs confirmation. Re-run with --yes, or clone a smaller path with --path.`,
    );
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt(rl, 'Do you really want to proceed? [y/N] ');
    if (!/^y(es)?$/i.test(String(answer).trim())) {
      throw new Error('Clone cancelled.');
    }
  } finally {
    rl.close();
  }
}

export default class CloneCommand {
  constructor(logger) {
    this.log = logger;
    this._dir = process.cwd();
    this._force = false;
    this._assumeYes = false;
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

  withAssumeYes(yes) {
    this._assumeYes = !!yes;
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

    // 3. Ensure target path is available (do not create content/ until after file count is known)
    const contentDir = path.resolve(this._dir, CONTENT_DIR);
    if (await fse.pathExists(contentDir)) {
      if (!this._force) {
        throw new Error(`'${CONTENT_DIR}' already exists. Use --force to overwrite.`);
      }
      await fse.remove(contentDir);
    }

    // 4. Fetch file list (no local content dir required yet)
    const client = new DaClient(token);
    log.info('Fetching file list...');
    const showDiscoveryProgress = process.stdout.isTTY;
    const files = await client.listAll(org, repo, this._rootPath, showDiscoveryProgress
      ? (n) => {
        process.stdout.write(`\r  ${n} file(s) discovered so far...`);
      }
      : undefined);
    if (showDiscoveryProgress) {
      process.stdout.write('\n');
    }
    log.info(`Found ${files.length} file(s).`);

    await confirmLargeCloneIfNeeded(log, files.length, this._assumeYes);

    // 5. Prepare content directory and project .gitignore
    await fse.ensureDir(contentDir);
    await this.ensureGitIgnored(CONTENT_DIR);

    log.info('Downloading...');

    // 6. Download files (bounded concurrency)
    const downloadResults = await mapWithConcurrency(files, DOWNLOAD_CONCURRENCY, async (file) => {
      const daPath = file.path.replace(`/${org}/${repo}`, '');
      const localPath = path.join(contentDir, ...daPath.split('/').filter(Boolean));
      try {
        const res = await client.getSource(org, repo, daPath);
        if (!res) {
          log.warn(`  skip (not found): ${daPath}`);
          return { status: 'skip' };
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        await fse.ensureDir(path.dirname(localPath));
        await fse.writeFile(localPath, buffer);
        log.info(`  ✓ ${daPath}`);
        return { status: 'ok', daPath };
      } catch (err) {
        log.warn(`  ✗ ${daPath}: ${err.message}`);
        return { status: 'error' };
      }
    });

    const downloaded = [];
    let errors = 0;
    for (const r of downloadResults) {
      if (r.status === 'ok') {
        downloaded.push(r.daPath);
      } else if (r.status === 'error') {
        errors += 1;
      }
    }

    // 7. Init git repo and commit as baseline
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

    // 8. Write config (not tracked by git)
    await fse.writeJson(path.join(contentDir, CONFIG_FILE), {
      org,
      repo,
      rootPath: this._rootPath,
    }, { spaces: 2 });

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
