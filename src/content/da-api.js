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
import mime from 'mime';
import processQueue from '@adobe/helix-shared-process-queue';
import { getFetch } from '../fetch-utils.js';
import { CONTENT_IO_CONCURRENCY } from './content-shared.js';

const DA_ADMIN = 'https://admin.da.live';

/** Response header used to page past the per-request list limit (e.g. 1000 items). */
const LIST_CONTINUATION_HEADER = 'da-continuation-token';

/** Safety cap on list pages per directory (avoids infinite loops if the API misbehaves). */
const LIST_MAX_PAGES = 50000;

export function getContentType(ext) {
  return mime.getType(ext) || 'application/octet-stream';
}

export class DaClient {
  constructor(token) {
    this.token = token;
    this.fetch = getFetch(false);
  }

  get authHeader() {
    return { Authorization: `Bearer ${this.token}` };
  }

  /**
   * Lists the contents of a directory, following {@link LIST_CONTINUATION_HEADER} until complete.
   * @param {string} org
   * @param {string} repo
   * @param {string} daPath - path starting with /
   * @returns {Promise<Array<{path, name, ext?, lastModified}>>}
   */
  async list(org, repo, daPath) {
    const url = `${DA_ADMIN}/list/${org}/${repo}${daPath}`;
    const aggregated = [];
    let continuation = null;

    for (let page = 0; page < LIST_MAX_PAGES; page += 1) {
      const headers = { ...this.authHeader };
      if (continuation) {
        headers[LIST_CONTINUATION_HEADER] = continuation;
      }
      // eslint-disable-next-line no-await-in-loop
      const res = await this.fetch(url, { headers });
      if (res.status === 401) {
        throw new Error('Unauthorized: invalid or missing token');
      }
      if (!res.ok) {
        throw new Error(`List failed for ${daPath}: ${res.status} ${res.statusText}`);
      }
      // eslint-disable-next-line no-await-in-loop
      const body = await res.json();
      if (!Array.isArray(body)) {
        throw new Error(`List response for ${daPath} must be a JSON array`);
      }
      aggregated.push(...body);

      const next = res.headers.get(LIST_CONTINUATION_HEADER);
      if (!next || next === continuation) {
        return aggregated;
      }
      continuation = next;
    }

    throw new Error(`List pagination for ${daPath} exceeded ${LIST_MAX_PAGES} pages.`);
  }

  /**
   * Recursively lists all files under a path using a non-recursive queue-based approach.
   * @param {string} org
   * @param {string} repo
   * @param {string} [daPath='/']
   * @param {(discoveredCount: number) => void} [onDiscovered] - cumulative file count per discovery
   * @returns {Promise<Array<{path, name, ext, lastModified}>>}
   */
  async listAll(org, repo, daPath = '/', onDiscovered = undefined) {
    const prefix = `/${org}/${repo}`;
    const files = [];
    let dirsToProcess = [daPath];

    while (dirsToProcess.length > 0) {
      const nextDirs = [];
      // eslint-disable-next-line no-await-in-loop
      await processQueue(
        dirsToProcess,
        async (currentPath) => {
          const items = await this.list(org, repo, currentPath);
          for (const item of items) {
            if (item.ext !== undefined) {
              files.push(item);
              if (onDiscovered) {
                onDiscovered(files.length);
              }
            } else {
              nextDirs.push(item.path.replace(prefix, '') || '/');
            }
          }
        },
        CONTENT_IO_CONCURRENCY,
      );
      dirsToProcess = nextDirs;
    }

    return files;
  }

  /**
   * Fetches the raw content of a file.
   * @returns {Promise<Response|null>}
   */
  async getSource(org, repo, daPath) {
    const url = `${DA_ADMIN}/source/${org}/${repo}${daPath}`;
    const res = await this.fetch(url, { headers: this.authHeader });
    if (res.status === 401) {
      throw new Error('Unauthorized: invalid or missing token');
    }
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error(`GET failed for ${daPath}: ${res.status} ${res.statusText}`);
    }
    return res;
  }

  /**
   * Uploads a file via PUT.
   * @param {string} org
   * @param {string} repo
   * @param {string} daPath
   * @param {Buffer} buffer
   * @param {string} contentType
   * @returns {Promise<object>} API response body
   */
  async putSource(org, repo, daPath, buffer, contentType) {
    const url = `${DA_ADMIN}/source/${org}/${repo}${daPath}`;
    const res = await this.fetch(url, {
      method: 'PUT',
      headers: { ...this.authHeader, 'Content-Type': contentType },
      body: buffer,
    });
    if (res.status === 401) {
      throw new Error('Unauthorized: invalid or missing token');
    }
    if (!res.ok) {
      throw new Error(`PUT failed for ${daPath}: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Deletes a file or folder. Idempotent.
   */
  async deleteSource(org, repo, daPath) {
    const url = `${DA_ADMIN}/source/${org}/${repo}${daPath}`;
    const res = await this.fetch(url, {
      method: 'DELETE',
      headers: this.authHeader,
    });
    if (res.status === 401) {
      throw new Error('Unauthorized: invalid or missing token');
    }
    return res.ok || res.status === 204;
  }

  /**
   * Returns the current lastModified for a file by listing its parent directory.
   * Results for the same parent are cached within a single call.
   * @param {string} org
   * @param {string} repo
   * @param {string} daPath - e.g. /blog/post.html
   * @param {Map} [cache] - optional Map for caching directory listings
   * @returns {Promise<number|null>}
   */
  async getRemoteLastModified(org, repo, daPath, cache = new Map()) {
    const parentPath = daPath.substring(0, daPath.lastIndexOf('/')) || '/';
    if (!cache.has(parentPath)) {
      const items = await this.list(org, repo, parentPath);
      cache.set(parentPath, items);
    }
    const items = cache.get(parentPath);
    const fullPath = `/${org}/${repo}${daPath}`;
    const item = items.find((i) => i.path === fullPath);
    return item ? item.lastModified : null;
  }
}
