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
import { diff3Merge } from 'node-diff3'; // eslint-disable-line import/no-unresolved
import { DaClient } from './da-api.js';
import { getValidToken } from './da-auth.js';
import { CONTENT_DIR, CONFIG_FILE } from './content-shared.js';

/**
 * 3-way merge using diff3 algorithm.
 * Returns { text, conflict }.
 */
function threeWayMerge(base, local, remote) {
  const baseLines = base.split('\n');
  const localLines = local.split('\n');
  const remoteLines = remote.split('\n');

  const regions = diff3Merge(localLines, baseLines, remoteLines);

  const out = [];
  let hasConflict = false;

  for (const region of regions) {
    if (region.ok) {
      out.push(...region.ok);
    } else {
      out.push('<<<<<<< LOCAL', ...region.conflict.a, '=======', ...region.conflict.b, '>>>>>>> REMOTE');
      hasConflict = true;
    }
  }

  return { text: out.join('\n'), conflict: hasConflict };
}

export default class MergeCommand {
  constructor(logger) {
    this.log = logger;
    this._dir = process.cwd();
    this._filePath = null;
  }

  withDirectory(dir) {
    this._dir = dir;
    return this;
  }

  withToken(token) {
    this._token = token;
    return this;
  }

  withFilePath(filePath) {
    this._filePath = filePath || null;
    return this;
  }

  async run() {
    const { log } = this;
    const contentDir = path.resolve(this._dir, CONTENT_DIR);
    const configPath = path.join(contentDir, CONFIG_FILE);

    if (!await fse.pathExists(configPath)) {
      throw new Error('No config found. Run \'aem content clone\' first.');
    }
    const { org, repo } = await fse.readJson(configPath);

    // Find locally changed files via git
    const matrix = await git.statusMatrix({ fs, dir: contentDir });
    let changedPaths = matrix
      .filter(([, head, workdir]) => head === 1 && workdir === 2)
      .map(([filepath]) => `/${filepath}`);

    if (this._filePath) {
      const needle = this._filePath.startsWith('/') ? this._filePath : `/${this._filePath}`;
      changedPaths = changedPaths.filter((p) => p === needle);
      if (changedPaths.length === 0) {
        log.info(`No local changes detected for ${needle}`);
        return;
      }
    }

    if (changedPaths.length === 0) {
      log.info('Nothing to merge. No locally modified files.');
      return;
    }

    const token = await getValidToken(log, this._token);
    const client = new DaClient(token);

    // Get the HEAD commit to read base blobs
    const [headCommit] = await git.log({ fs, dir: contentDir, depth: 1 });

    let cleanCount = 0;
    let conflictCount = 0;

    for (const daPath of changedPaths) {
      const relPath = daPath.slice(1); // strip leading /
      const localPath = path.join(contentDir, ...daPath.split('/').filter(Boolean));

      // eslint-disable-next-line no-await-in-loop
      const [localBuffer, remoteRes, blobResult] = await Promise.all([
        fse.readFile(localPath),
        client.getSource(org, repo, daPath),
        git.readBlob({
          fs, dir: contentDir, oid: headCommit.oid, filepath: relPath,
        })
          .catch(() => null),
      ]);

      const localText = localBuffer.toString('utf-8');
      // eslint-disable-next-line no-await-in-loop
      const remoteText = remoteRes ? await remoteRes.text() : '';
      const baseText = blobResult ? Buffer.from(blobResult.blob).toString('utf-8') : '';

      const { text: merged, conflict } = threeWayMerge(baseText, localText, remoteText);

      // eslint-disable-next-line no-await-in-loop
      await fse.writeFile(localPath, merged, 'utf-8');

      if (conflict) {
        log.info(`CONFLICT ${daPath}`);
        conflictCount += 1;
      } else {
        log.info(`merged  ${daPath}`);
        cleanCount += 1;
      }
    }

    log.info('');
    if (conflictCount > 0) {
      log.info(`Merge complete: ${cleanCount} clean, ${conflictCount} with conflicts.`);
      log.info('Resolve conflicts manually, then: aem content add, aem content commit -m "...", aem content push');
    } else {
      log.info(`Merge complete: ${cleanCount} file(s) merged cleanly.`);
      log.info('Review changes, then: aem content add, aem content commit -m "...", aem content push');
    }
  }
}
