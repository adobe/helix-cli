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

/**
 * Paths for git add are relative to the content repo root. Accept optional
 * `content/…` (or `{CONTENT_DIR}/…`) so shells can tab-complete from the project root.
 * @param {string} raw
 * @returns {string}
 */
export function normalizePathForContentAdd(raw) {
  let s = String(raw).trim().replace(/\\/g, '/');
  while (s.startsWith('./')) {
    s = s.slice(2);
  }
  const prefix = `${CONTENT_DIR}/`;
  if (s === CONTENT_DIR || s === `${CONTENT_DIR}/`) {
    return '.';
  }
  if (s.startsWith(prefix)) {
    const rest = s.slice(prefix.length);
    return rest.length > 0 ? rest : '.';
  }
  return s.length > 0 ? s : '.';
}

export default class AddCommand {
  constructor(logger) {
    this.log = logger;
    this._dir = process.cwd();
    /** @type {string[]} */
    this._paths = ['.'];
  }

  withDirectory(dir) {
    this._dir = dir;
    return this;
  }

  /**
   * @param {string[]} paths paths relative to content/ (default ["."])
   */
  withPaths(paths) {
    this._paths = paths && paths.length > 0 ? paths : ['.'];
    return this;
  }

  async run() {
    const { log } = this;
    const contentDir = path.resolve(this._dir, CONTENT_DIR);
    const configPath = path.join(contentDir, CONFIG_FILE);

    if (!await fse.pathExists(configPath)) {
      throw new Error(`No config found at ${configPath}. Run 'aem content clone' first.`);
    }

    const normalized = this._paths.map((p) => normalizePathForContentAdd(p));

    for (const fp of normalized) {
      // eslint-disable-next-line no-await-in-loop
      await git.add({ fs, dir: contentDir, filepath: fp });
    }
    log.info(`Staged: ${normalized.join(', ')}`);
  }
}
