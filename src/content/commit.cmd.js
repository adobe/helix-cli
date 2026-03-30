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
import { CONTENT_DIR, CONFIG_FILE, GIT_AUTHOR } from './content-shared.js';

export default class CommitCommand {
  constructor(logger) {
    this.log = logger;
    this._dir = process.cwd();
    this._message = '';
  }

  withDirectory(dir) {
    this._dir = dir;
    return this;
  }

  withMessage(message) {
    this._message = message || '';
    return this;
  }

  async run() {
    const { log } = this;
    const contentDir = path.resolve(this._dir, CONTENT_DIR);
    const configPath = path.join(contentDir, CONFIG_FILE);

    if (!await fse.pathExists(configPath)) {
      throw new Error(`No config found at ${configPath}. Run 'aem content clone' first.`);
    }

    const msg = String(this._message).trim();
    if (!msg) {
      throw new Error('Commit message is required. Use -m "your message".');
    }

    const oid = await git.commit({
      fs,
      dir: contentDir,
      message: msg,
      author: GIT_AUTHOR,
    });
    log.info(`Committed ${oid.slice(0, 7)}`);
  }
}
