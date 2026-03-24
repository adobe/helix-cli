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
import { DaClient, getContentType } from './da-api.js';
import { getValidToken } from './da-auth.js';
import {
  CONTENT_DIR,
  CONFIG_FILE,
  GIT_AUTHOR,
  CONTENT_TRANSFER_CONCURRENCY,
  mapWithConcurrency,
} from './clone.cmd.js';

export default class PushCommand {
  constructor(logger) {
    this.log = logger;
    this._dir = process.cwd();
    this._force = false;
    this._dryRun = false;
    this._pushPath = null;
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

  withDryRun(dryRun) {
    this._dryRun = dryRun;
    return this;
  }

  withPath(pushPath) {
    this._pushPath = pushPath || null;
    return this;
  }

  async run() {
    const { log } = this;
    const contentDir = path.resolve(this._dir, CONTENT_DIR);
    const configPath = path.join(contentDir, CONFIG_FILE);

    // 1. Load config
    if (!await fse.pathExists(configPath)) {
      throw new Error(`No config found at ${configPath}. Run 'aem content clone' first.`);
    }
    const { org, repo } = await fse.readJson(configPath);

    // 2. Get baseline from last git commit (seconds → ms for comparison with da.live)
    const [lastCommit] = await git.log({ fs, dir: contentDir, depth: 1 });
    const lastSyncTime = lastCommit.commit.committer.timestamp * 1000;

    // 3. Resolve token
    const token = await getValidToken(log, this._token);

    log.info(`Pushing content to da.live: ${org}/${repo}`);

    // 4. Detect local changes via git status matrix
    // statusMatrix columns: [filepath, HEAD, WORKDIR, STAGE]
    // HEAD=0: absent in last commit, WORKDIR=2: differs from HEAD, WORKDIR=0: deleted
    const matrix = await git.statusMatrix({ fs, dir: contentDir });
    const inScope = (daPath) => !this._pushPath || daPath.startsWith(this._pushPath);

    const added = [];
    const modified = [];
    const deleted = [];

    for (const [filepath, head, workdir] of matrix) {
      const daPath = `/${filepath}`;
      if (!inScope(daPath)) continue; // eslint-disable-line no-continue
      if (head === 0 && workdir === 2) added.push(daPath);
      else if (head === 1 && workdir === 2) modified.push(daPath);
      else if (head === 1 && workdir === 0) deleted.push(daPath);
    }

    if (added.length === 0 && modified.length === 0 && deleted.length === 0) {
      log.info('Nothing to push. Local content matches the clone baseline.');
      return;
    }

    log.info(`${added.length} added, ${modified.length} modified, ${deleted.length} deleted`);

    // 5. Conflict detection: remote changed since our last sync?
    const client = new DaClient(token);
    const dirCache = new Map();
    const conflicts = [];

    for (const daPath of [...modified, ...deleted]) {
      // eslint-disable-next-line no-await-in-loop
      const remoteLastModified = await client.getRemoteLastModified(org, repo, daPath, dirCache);
      if (remoteLastModified != null && remoteLastModified > lastSyncTime) {
        conflicts.push({ daPath, remoteDate: new Date(remoteLastModified).toLocaleString() });
      }
    }

    if (conflicts.length > 0) {
      log.warn('\nConflicts detected — remote files were modified after your last sync:\n');
      for (const { daPath, remoteDate } of conflicts) {
        log.warn(`  ✗ ${daPath}  (remote modified ${remoteDate})`);
      }
      if (!this._force) {
        log.warn('\nPush aborted. Use --force to overwrite remote changes.');
        process.exitCode = 1;
        return;
      }
      log.warn('\n--force specified: overwriting remote changes.');
    }

    if (this._dryRun) {
      log.info('\nDry run — no files were pushed.');
      if (added.length) {
        log.info('\nWould add:');
        for (const p of added) log.info(`  + ${p}`);
      }
      if (modified.length) {
        log.info('\nWould update:');
        for (const p of modified) log.info(`  ~ ${p}`);
      }
      if (deleted.length) {
        log.info('\nWould delete:');
        for (const p of deleted) log.info(`  - ${p}`);
      }
      return;
    }

    // 6. Push changes (bounded concurrency), tracking which succeeded
    let pushed = 0;
    let pushErrors = 0;
    const successfullyPushed = new Set();
    const successfullyDeleted = new Set();

    const putTargets = [...added, ...modified];
    const putResults = await mapWithConcurrency(
      putTargets,
      CONTENT_TRANSFER_CONCURRENCY,
      async (daPath) => {
        const localPath = path.join(contentDir, ...daPath.split('/').filter(Boolean));
        const ext = daPath.split('.').pop();
        try {
          const buffer = await fse.readFile(localPath);
          await client.putSource(org, repo, daPath, buffer, getContentType(ext));
          log.info(`  ✓ ${daPath}`);
          return { ok: true, daPath };
        } catch (err) {
          log.warn(`  ✗ ${daPath}: ${err.message}`);
          return { ok: false };
        }
      },
    );
    for (const r of putResults) {
      if (r.ok) {
        pushed += 1;
        successfullyPushed.add(r.daPath);
      } else {
        pushErrors += 1;
      }
    }

    const deleteResults = await mapWithConcurrency(
      deleted,
      CONTENT_TRANSFER_CONCURRENCY,
      async (daPath) => {
        try {
          await client.deleteSource(org, repo, daPath);
          log.info(`  ✓ deleted ${daPath}`);
          return { ok: true, daPath };
        } catch (err) {
          log.warn(`  ✗ ${daPath}: ${err.message}`);
          return { ok: false };
        }
      },
    );
    for (const r of deleteResults) {
      if (r.ok) {
        pushed += 1;
        successfullyDeleted.add(r.daPath);
      } else {
        pushErrors += 1;
      }
    }

    // 7. Stage and commit only successfully pushed files
    if (successfullyPushed.size + successfullyDeleted.size > 0) {
      for (const daPath of successfullyPushed) {
        // eslint-disable-next-line no-await-in-loop
        await git.add({ fs, dir: contentDir, filepath: daPath.replace(/^\//, '') });
      }
      for (const daPath of successfullyDeleted) {
        // eslint-disable-next-line no-await-in-loop
        await git.remove({ fs, dir: contentDir, filepath: daPath.replace(/^\//, '') });
      }
      await git.commit({
        fs,
        dir: contentDir,
        message: `push: ${org}/${repo}`,
        author: GIT_AUTHOR,
      });
    }

    log.info(`\nDone. ${pushed} file(s) pushed${pushErrors > 0 ? `, ${pushErrors} error(s)` : ''}.`);
  }
}
