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
import {
  DaClient, getContentType, isSameDaAdmin, resolveDaAdmin,
} from './da-api.js';
import { getValidToken } from './da-auth.js';
import {
  CONTENT_DIR,
  CONTENT_IO_CONCURRENCY,
  readContentConfig,
} from './content-shared.js';
import {
  resolveSyncedOid,
  writeSyncedRef,
  statusMatrixHasUncommitted,
  diffCommitTrees,
  listCommitFiles,
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
   * @param {string} site
   * @param {string[]} modified
   * @param {string[]} deleted
   * @param {number} lastSyncTime
   * @returns {Promise<boolean>} true if the push should be aborted
   */
  async _checkConflicts(client, org, site, modified, deleted, lastSyncTime) {
    const { log } = this;
    const conflicts = [];

    for (const daPath of [...modified, ...deleted]) {
      // eslint-disable-next-line no-await-in-loop
      const remoteLastModified = await client.getRemoteLastModified(org, site, daPath);
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
   * @param {string} site
   * @param {string} contentDir
   * @param {string[]} targets
   * @returns {Promise<{ pushed: number, errors: number }>}
   */
  async _uploadFiles(client, org, site, contentDir, targets) {
    const { log } = this;
    let pushed = 0;
    let errors = 0;

    // processQueue consumes its input array via shift(); copy so the caller's list survives.
    const results = await processQueue(
      [...targets],
      async (daPath) => {
        const localPath = path.join(contentDir, ...daPath.split('/').filter(Boolean));
        const ext = daPath.split('.').pop();
        try {
          const buffer = await fse.readFile(localPath);
          await client.putSource(org, site, daPath, buffer, getContentType(ext));
          log.info(`  ✓ ${daPath}`);
          return { ok: true };
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
      } else {
        errors += 1;
      }
    }

    return { pushed, errors };
  }

  /**
   * Deletes files from da.live.
   * @param {DaClient} client
   * @param {string} org
   * @param {string} site
   * @param {string[]} deleted
   * @returns {Promise<{ pushed: number, errors: number }>}
   */
  async _deleteFiles(client, org, site, deleted) {
    const { log } = this;
    let pushed = 0;
    let errors = 0;

    // processQueue consumes its input array via shift(); copy so the caller's list survives.
    const results = await processQueue(
      [...deleted],
      async (daPath) => {
        try {
          await client.deleteSource(org, site, daPath);
          log.info(`  ✓ deleted ${daPath}`);
          return { ok: true };
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
      } else {
        errors += 1;
      }
    }

    return { pushed, errors };
  }

  async run() {
    const { log } = this;
    const contentDir = path.resolve(this._dir, CONTENT_DIR);
    const { org, site, daAdmin: clonedFrom } = await readContentConfig(contentDir);

    const matrix = await git.statusMatrix({ fs, dir: contentDir });
    if (statusMatrixHasUncommitted(matrix)) {
      throw new Error(
        'Cannot push: you have uncommitted changes in content/. '
        + 'Stage with \'aem content add\' and commit with \'aem content commit -m "..."\'.',
      );
    }

    const headOid = await git.resolveRef({ fs, dir: contentDir, ref: 'HEAD' });

    // A push to a backend other than the one cloned from is a copy, not a sync: the local
    // baseline describes the source backend, so it says nothing about the target.
    const crossBackend = clonedFrom !== undefined
      && !isSameDaAdmin(clonedFrom, resolveDaAdmin());
    if (crossBackend && !this._force) {
      log.warn(
        'Push aborted: pushing to a different backend than cloned from; use --force to copy.',
      );
      process.exitCode = 1;
      return;
    }

    const scope = this._pushPath ? this._pushPath.replace(/\/+$/, '') : null;
    const inScope = (daPath) => scope === null
      || daPath === scope
      || daPath.startsWith(`${scope}/`);

    let added;
    let modified;
    let deleted;
    let scopeIsComplete;
    let lastSyncTime = null;

    if (crossBackend) {
      // Overwrite copy: every file is uploaded, nothing is deleted on the target, and the
      // sync baseline stays with the backend it belongs to.
      added = (await listCommitFiles(fs, contentDir, headOid)).filter(inScope);
      modified = [];
      deleted = [];
      scopeIsComplete = false;
    } else {
      const syncedOid = await resolveSyncedOid(fs, contentDir);
      lastSyncTime = await getCommitCommitterTimeMs(fs, contentDir, syncedOid);

      const fullChanges = await diffCommitTrees(fs, contentDir, syncedOid, headOid);
      added = fullChanges.added.filter(inScope);
      modified = fullChanges.modified.filter(inScope);
      deleted = fullChanges.deleted.filter(inScope);

      const fullCount = fullChanges.added.length
        + fullChanges.modified.length
        + fullChanges.deleted.length;
      const scopeCount = added.length + modified.length + deleted.length;
      scopeIsComplete = fullCount === scopeCount;
    }

    if (added.length === 0 && modified.length === 0 && deleted.length === 0) {
      log.info('Nothing to push. No commits ahead of the last da.live sync.');
      return;
    }

    const token = await getValidToken(log, this._token, this._dir);

    log.info(`Pushing content to da.live: ${org}/${site}`);
    if (crossBackend) {
      log.info(
        'Target backend differs from the one cloned from: copying all files and '
        + 'skipping the conflict check.',
      );
    }
    log.info(`${added.length} added, ${modified.length} modified, ${deleted.length} deleted`);

    const client = new DaClient(token);

    if (!crossBackend) {
      const shouldAbort = await this._checkConflicts(
        client,
        org,
        site,
        modified,
        deleted,
        lastSyncTime,
      );
      if (shouldAbort) {
        return;
      }
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

    const {
      pushed: putPushed,
      errors: putErrors,
    } = await this._uploadFiles(client, org, site, contentDir, [...added, ...modified]);

    const {
      pushed: deletePushed,
      errors: deleteErrors,
    } = await this._deleteFiles(client, org, site, deleted);

    const pushed = putPushed + deletePushed;
    const pushErrors = putErrors + deleteErrors;
    const allOk = pushErrors === 0;

    if (allOk && crossBackend) {
      log.info(
        '\nCopied to a different backend. The local sync baseline still points at the '
        + 'backend you cloned from.',
      );
    } else if (allOk && scopeIsComplete) {
      await writeSyncedRef(fs, contentDir, headOid);
    } else if (allOk) {
      log.info(
        '\n--path filter held back other changes; sync ref not advanced. '
        + 'Run \'aem content push\' (without --path) to fully sync.',
      );
    } else {
      log.warn('\nSync ref not updated: fix errors and push again to finish syncing this commit.');
    }

    log.info(`\nDone. ${pushed} file(s) pushed${pushErrors > 0 ? `, ${pushErrors} error(s)` : ''}.`);
  }
}
