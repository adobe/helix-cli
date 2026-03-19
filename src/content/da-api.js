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
import { getFetch } from '../fetch-utils.js';

const DA_ADMIN = 'https://admin.da.live';

/** Max concurrent directory listings during {@link DaClient#listAll}. */
const LIST_ALL_CONCURRENCY = 10;

/**
 * @param {number} maxConcurrent
 * @returns {<T>(fn: () => Promise<T>) => Promise<T>}
 */
function createLimiter(maxConcurrent) {
  let running = 0;
  const waiters = [];
  return async function limit(fn) {
    while (running >= maxConcurrent) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => {
        waiters.push(r);
      });
    }
    running += 1;
    try {
      return await fn();
    } finally {
      running -= 1;
      const w = waiters.shift();
      if (w) w();
    }
  };
}

const CONTENT_TYPES = {
  html: 'text/html',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

export function getContentType(ext) {
  return CONTENT_TYPES[ext?.toLowerCase()] || 'application/octet-stream';
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
   * Lists the contents of a directory.
   * @param {string} org
   * @param {string} repo
   * @param {string} daPath - path starting with /
   * @returns {Promise<Array<{path, name, ext?, lastModified}>>}
   */
  async list(org, repo, daPath) {
    const url = `${DA_ADMIN}/list/${org}/${repo}${daPath}`;
    const res = await this.fetch(url, { headers: this.authHeader });
    if (res.status === 401) throw new Error('Unauthorized: invalid or missing token');
    if (!res.ok) throw new Error(`List failed for ${daPath}: ${res.status} ${res.statusText}`);
    return res.json();
  }

  /**
   * Recursively lists all files under a path. Sibling folders are listed in parallel (bounded).
   * @param {string} org
   * @param {string} repo
   * @param {string} [daPath='/']
   * @param {(discoveredCount: number) => void} [onDiscovered] - cumulative file count per discovery
   * @returns {Promise<Array<{path, name, ext, lastModified}>>}
   */
  async listAll(org, repo, daPath = '/', onDiscovered = undefined) {
    const state = { count: 0, onDiscovered };
    const ctx = this;
    const limit = createLimiter(LIST_ALL_CONCURRENCY);

    async function recurse(currentPath) {
      const items = await limit(() => ctx.list(org, repo, currentPath));
      const acc = [];
      const subdirs = [];
      for (const item of items) {
        if (item.ext !== undefined) {
          acc.push(item);
          state.count += 1;
          if (state.onDiscovered) {
            state.onDiscovered(state.count);
          }
        } else {
          subdirs.push(item.path.replace(`/${org}/${repo}`, '') || '/');
        }
      }
      if (subdirs.length > 0) {
        const nested = await Promise.all(subdirs.map((sub) => recurse(sub)));
        for (const part of nested) {
          acc.push(...part);
        }
      }
      return acc;
    }
    return recurse(daPath);
  }

  /**
   * Fetches the raw content of a file.
   * @returns {Promise<Response>}
   */
  async getSource(org, repo, daPath) {
    const url = `${DA_ADMIN}/source/${org}/${repo}${daPath}`;
    const res = await this.fetch(url, { headers: this.authHeader });
    if (res.status === 401) throw new Error('Unauthorized: invalid or missing token');
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GET failed for ${daPath}: ${res.status} ${res.statusText}`);
    return res;
  }

  /**
   * Uploads a file via multipart/form-data.
   * @param {string} org
   * @param {string} repo
   * @param {string} daPath
   * @param {Buffer} buffer
   * @param {string} contentType
   * @returns {Promise<object>} API response body
   */
  async putSource(org, repo, daPath, buffer, contentType) {
    const url = `${DA_ADMIN}/source/${org}/${repo}${daPath}`;
    const formData = new FormData();
    formData.append('data', new Blob([buffer], { type: contentType }), daPath.split('/').pop());
    const res = await this.fetch(url, {
      method: 'POST',
      headers: this.authHeader,
      body: formData,
    });
    if (res.status === 401) throw new Error('Unauthorized: invalid or missing token');
    if (!res.ok) throw new Error(`PUT failed for ${daPath}: ${res.status} ${res.statusText}`);
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
    if (res.status === 401) throw new Error('Unauthorized: invalid or missing token');
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
