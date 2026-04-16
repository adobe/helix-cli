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
import processQueue from '@adobe/helix-shared-process-queue';
import { DaClient, getContentType } from './da-api.js';
import { getValidToken } from './da-auth.js';
import {
  CONTENT_DIR,
  CONFIG_FILE,
  CONTENT_IO_CONCURRENCY,
} from './content-shared.js';
import {
  resolveSyncedOid,
  writeSyncedRef,
  statusMatrixHasUncommitted,
  diffCommitTrees,
  getCommitCommitterTimeMs,
} from './content-git.js';

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

  /**
   * Checks for conflicts between local changes and remote modifications.
   * @param {DaClient} client
   * @param {string} org
   * @param {string} repo
   * @param {string[]} modified
   * @param {string[]} deleted
   * @param {number} lastSyncTime
   * @returns {Promise<boolean>} true if the push should be aborted
   */
  async _checkConflicts(client, org, repo, modified, deleted, lastSyncTime) {
    const { log } = this;
    const conflicts = [];

    for (const daPath of [...modified, ...deleted]) {
      // eslint-disable-next-line no-await-in-loop
      const remoteLastModified = await client.getRemoteLastModified(org, repo, daPath);
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
        return true;
      }
      log.warn('\n--force specified: overwriting remote changes.');
    }

    return false;
  }

  /**
   * Uploads added and modified files to da.live.
   * @param {DaClient} client
   * @param {string} org
   * @param {string} repo
   * @param {string} contentDir
   * @param {string[]} targets
   * @returns {Promise<{ pushed: number, errors: number, successfullyPushed: Set<string> }>}
   */
  async _uploadFiles(client, org, repo, contentDir, targets) {
    const { log } = this;
    let pushed = 0;
    let errors = 0;
    const successfullyPushed = new Set();

    const results = await processQueue(
      targets,
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
      CONTENT_IO_CONCURRENCY,
    );
    for (const r of results) {
      if (r.ok) {
        pushed += 1;
        successfullyPushed.add(r.daPath);
      } else {
        errors += 1;
      }
    }

    return { pushed, errors, successfullyPushed };
  }

  /**
   * Deletes files from da.live.
   * @param {DaClient} client
   * @param {string} org
   * @param {string} repo
   * @param {string[]} deleted
   * @returns {Promise<{ pushed: number, errors: number, successfullyDeleted: Set<string> }>}
   */
  async _deleteFiles(client, org, repo, deleted) {
    const { log } = this;
    let pushed = 0;
    let errors = 0;
    const successfullyDeleted = new Set();

    const results = await processQueue(
      deleted,
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
      CONTENT_IO_CONCURRENCY,
    );
    for (const r of results) {
      if (r.ok) {
        pushed += 1;
        successfullyDeleted.add(r.daPath);
      } else {
        errors += 1;
      }
    }

    return { pushed, errors, successfullyDeleted };
  }

  async run() {
    const { log } = this;
    const contentDir = path.resolve(this._dir, CONTENT_DIR);
    const configPath = path.join(contentDir, CONFIG_FILE);

    if (!await fse.pathExists(configPath)) {
      throw new Error(`No config found at ${configPath}. Run 'aem content clone' first.`);
    }
    const { org, repo } = await fse.readJson(configPath);

    const matrix = await git.statusMatrix({ fs, dir: contentDir });
    if (statusMatrixHasUncommitted(matrix)) {
      throw new Error(
        'Cannot push: you have uncommitted changes in content/. '
        + 'Stage with \'aem content add\' and commit with \'aem content commit -m "..."\'.',
      );
    }

    const headOid = await git.resolveRef({ fs, dir: contentDir, ref: 'HEAD' });
    const syncedOid = await resolveSyncedOid(fs, contentDir);
    const lastSyncTime = await getCommitCommitterTimeMs(fs, contentDir, syncedOid);

    let { added, modified, deleted } = await diffCommitTrees(fs, contentDir, syncedOid, headOid);

    const inScope = (daPath) => !this._pushPath || daPath.startsWith(this._pushPath);
    added = added.filter(inScope);
    modified = modified.filter(inScope);
    deleted = deleted.filter(inScope);

    if (added.length === 0 && modified.length === 0 && deleted.length === 0) {
      log.info('Nothing to push. No commits ahead of the last da.live sync.');
      return;
    }

    const token = await getValidToken(log, this._token, this._dir);

    log.info(`Pushing content to da.live: ${org}/${repo}`);
    log.info(`${added.length} added, ${modified.length} modified, ${deleted.length} deleted`);

    const client = new DaClient(token);

    const shouldAbort = await this._checkConflicts(
      client,
      org,
      repo,
      modified,
      deleted,
      lastSyncTime,
    );
    if (shouldAbort) {
      return;
    }

    if (this._dryRun) {
      log.info('\nDry run — no files were pushed.');
      if (added.length) {
        log.info('\nWould add:');
        for (const p of added) {
          log.info(`  + ${p}`);
        }
      }
      if (modified.length) {
        log.info('\nWould update:');
        for (const p of modified) {
          log.info(`  ~ ${p}`);
        }
      }
      if (deleted.length) {
        log.info('\nWould delete:');
        for (const p of deleted) {
          log.info(`  - ${p}`);
        }
      }
      return;
    }

    const putTargets = [...added, ...modified];
    const {
      pushed: putPushed,
      errors: putErrors,
      successfullyPushed,
    } = await this._uploadFiles(client, org, repo, contentDir, putTargets);

    const {
      pushed: deletePushed,
      errors: deleteErrors,
      successfullyDeleted,
    } = await this._deleteFiles(client, org, repo, deleted);

    const pushed = putPushed + deletePushed;
    const pushErrors = putErrors + deleteErrors;

    const allPutsOk = putTargets.every((p) => successfullyPushed.has(p));
    const allDeletesOk = deleted.every((p) => successfullyDeleted.has(p));

    if (allPutsOk && allDeletesOk) {
      await writeSyncedRef(fs, contentDir, headOid);
    } else {
      log.warn('\nSync ref not updated: fix errors and push again to finish syncing this commit.');
    }

    log.info(`\nDone. ${pushed} file(s) pushed${pushErrors > 0 ? `, ${pushErrors} error(s)` : ''}.`);
  }
}
