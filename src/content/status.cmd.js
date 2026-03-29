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
import { CONTENT_DIR, CONFIG_FILE } from './content-shared.js';
import { resolveSyncedOid, countCommitsAhead } from './content-git.js';

export default class StatusCommand {
  constructor(logger) {
    this.log = logger;
    this._dir = process.cwd();
  }

  withDirectory(dir) {
    this._dir = dir;
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

    log.info(`On da.live: ${org}/${repo}`);
    log.info(`Local content: ./${CONTENT_DIR}/\n`);

    const matrix = await git.statusMatrix({ fs, dir: contentDir });

    const added = [];
    const modified = [];
    const deleted = [];

    for (const [filepath, head, workdir] of matrix) {
      if (head === 0 && workdir === 2) added.push(filepath);
      else if (head === 1 && workdir === 2) modified.push(filepath);
      else if (head === 1 && workdir === 0) deleted.push(filepath);
    }

    const headOid = await git.resolveRef({ fs, dir: contentDir, ref: 'HEAD' });
    const syncedOid = await resolveSyncedOid(fs, contentDir);
    const ahead = await countCommitsAhead(fs, contentDir, headOid, syncedOid);

    if (added.length === 0 && modified.length === 0 && deleted.length === 0) {
      log.info('No uncommitted changes in content/.');
      if (ahead === 0) {
        log.info('Nothing to push to da.live.');
      } else {
        log.info(`${ahead} commit(s) not yet pushed to da.live. Run 'aem content push'.`);
      }
      return;
    }

    if (added.length) {
      log.info('Added (unstaged or not committed):');
      for (const f of added) log.info(`  A  /${f}`);
    }
    if (modified.length) {
      log.info('Modified (unstaged or not committed):');
      for (const f of modified) log.info(`  M  /${f}`);
    }
    if (deleted.length) {
      log.info('Deleted (unstaged or not committed):');
      for (const f of deleted) log.info(`  D  /${f}`);
    }

    log.info(`\n${added.length} added, ${modified.length} modified, ${deleted.length} deleted`);
  }
}
