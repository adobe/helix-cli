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

import path from 'path';
import fse from 'fs-extra';

export const CONTENT_DIR = 'content';
export const CONFIG_FILE = '.da-config.json';
export const GIT_AUTHOR = { name: 'aem-cli', email: 'aem-cli@adobe.com' };

/** Above this count, clone warns and requires confirmation (or --yes). */
export const LARGE_CLONE_FILE_THRESHOLD = 10000;

/**
 * Parallelism for da.live I/O: recursive list fan-out, clone downloads, push uploads/deletes.
 */
export const CONTENT_IO_CONCURRENCY = 10;

/**
 * Reads and normalizes the content config from a content directory.
 * Accepts both current keys (org/site) and legacy keys (owner/repo) written
 * by earlier versions of clone. org/site take priority when both are present.
 * @param {string} contentDir - absolute path to the content/ directory
 * @returns {Promise<{org: string, site: string, rootPath: string|undefined}>}
 * @throws if the config file is missing or org/site cannot be resolved
 */
export async function readContentConfig(contentDir) {
  const configPath = path.join(contentDir, CONFIG_FILE);
  if (!await fse.pathExists(configPath)) {
    throw new Error(`No config found at ${configPath}. Run 'aem content clone' first.`);
  }
  const raw = await fse.readJson(configPath);
  const org = (raw.org || raw.owner || '').toLowerCase();
  const site = (raw.site || raw.repo || '').toLowerCase();
  if (!org || !site) {
    throw new Error(`Invalid config: org and site are required in ${configPath}.`);
  }
  return { org, site, rootPath: raw.rootPath };
}

/**
 * Normalizes a da.live path: leading slash, no trailing slash except root.
 * @param {string} input
 * @returns {string}
 * @throws {Error} if input is null, undefined, or empty
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
