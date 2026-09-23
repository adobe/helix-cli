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

/** Default DA admin host. */
export const DEFAULT_DA_ADMIN = 'https://admin.da.live';

/**
 * Resolves the DA admin host to use.
 *
 * Order: explicit value, then the `AEM_DA_ADMIN` environment variable, then the default.
 * Trailing slashes are removed so the host can be concatenated with API paths.
 *
 * @param {string} [daAdmin] explicit admin host, overriding the environment
 * @returns {string} admin host without a trailing slash
 */
export function resolveDaAdmin(daAdmin) {
  const value = (daAdmin ?? process.env.AEM_DA_ADMIN ?? '').trim();
  return (value || DEFAULT_DA_ADMIN).replace(/\/+$/, '');
}

/** Label used for the default admin host. */
export const DEFAULT_DA_ENV_LABEL = 'prod';

/**
 * Compares two already resolved admin hosts. The comparison is on the origin only,
 * so a trailing slash or a different case still counts as the same backend.
 *
 * @param {string} a first admin host
 * @param {string} b second admin host
 * @returns {boolean} true when both point at the same backend
 */
export function isSameDaAdmin(a, b) {
  const origin = (value) => {
    const normalized = String(value ?? '').trim().replace(/\/+$/, '');
    try {
      return new URL(normalized).origin.toLowerCase();
    } catch {
      return normalized.toLowerCase();
    }
  };
  return origin(a) === origin(b);
}

/**
 * Derives a short environment label from the resolved DA admin host, so that per-host
 * state (the cached IMS token, for example) never clobbers another host's state.
 *
 * The default host keeps the {@link DEFAULT_DA_ENV_LABEL} label. A host whose first
 * name ends in `-admin` contributes the part before it, so `foo-admin.example.com`
 * becomes `foo`. Anything else falls back to the sanitized host name.
 *
 * @param {string} [daAdmin] explicit admin host, overriding the environment
 * @returns {string} label safe to use in a file name
 */
export function resolveDaEnvLabel(daAdmin) {
  const sanitize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const { hostname } = new URL(resolveDaAdmin(daAdmin));
  if (hostname.toLowerCase() === new URL(DEFAULT_DA_ADMIN).hostname) {
    return DEFAULT_DA_ENV_LABEL;
  }
  const prefix = hostname.toLowerCase().split('.')[0].match(/^(.+)-admin$/);
  return sanitize(prefix ? prefix[1] : hostname) || DEFAULT_DA_ENV_LABEL;
}

/** Response header used to page past the per-request list limit (e.g. 1000 items). */
const LIST_CONTINUATION_HEADER = 'da-continuation-token';

/** Safety cap on list pages per directory (avoids infinite loops if the API misbehaves). */
const LIST_MAX_PAGES = 50000;

export function getContentType(ext) {
  return mime.getType(ext) || 'application/octet-stream';
}

export class DaClient {
  /**
   * @param {string} token IMS bearer token
   * @param {string} [daAdmin] admin host, defaults to {@link resolveDaAdmin}
   */
  constructor(token, daAdmin) {
    this.token = token;
    this.daAdmin = resolveDaAdmin(daAdmin);
    this.fetch = getFetch(false);
  }

  get authHeader() {
    return { Authorization: `Bearer ${this.token}` };
  }

  /**
   * Lists the contents of a directory, following {@link LIST_CONTINUATION_HEADER} until complete.
   * @param {string} org
   * @param {string} site
   * @param {string} daPath - path starting with /
   * @returns {Promise<Array<{path, name, ext?, lastModified}>>}
   */
  async list(org, site, daPath) {
    const url = `${this.daAdmin}/list/${org}/${site}${daPath}`;
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

    return aggregated;
  }

  /**
   * Recursively lists all files under a path using a non-recursive queue-based approach.
   * @param {string} org
   * @param {string} site
   * @param {string} [daPath='/']
   * @param {(discoveredCount: number) => void} [onDiscovered] - cumulative file count per discovery
   * @returns {Promise<Array<{path, name, ext, lastModified}>>}
   */
  async listAll(org, site, daPath = '/', onDiscovered = undefined) {
    const prefix = `/${org}/${site}`;
    const files = [];
    let dirsToProcess = [daPath];

    while (dirsToProcess.length > 0) {
      const nextDirs = [];
      // eslint-disable-next-line no-await-in-loop
      await processQueue(
        dirsToProcess,
        async (currentPath) => {
          const items = await this.list(org, site, currentPath);
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
   * @param {string} org
   * @param {string} site
   * @param {string} daPath
   * @returns {Promise<Response|null>}
   */
  async getSource(org, site, daPath) {
    const url = `${this.daAdmin}/source/${org}/${site}${daPath}`;
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
   * @param {string} site
   * @param {string} daPath
   * @param {Buffer} buffer
   * @param {string} contentType
   * @returns {Promise<object>} API response body
   */
  async putSource(org, site, daPath, buffer, contentType) {
    const url = `${this.daAdmin}/source/${org}/${site}${daPath}`;
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
   * Deletes a file or folder. Idempotent: 404 is treated as success.
   * Throws on transport or server errors so callers don't silently treat them as success.
   */
  async deleteSource(org, site, daPath) {
    const url = `${this.daAdmin}/source/${org}/${site}${daPath}`;
    const res = await this.fetch(url, {
      method: 'DELETE',
      headers: this.authHeader,
    });
    if (res.status === 401) {
      throw new Error('Unauthorized: invalid or missing token');
    }
    if (res.ok || res.status === 204 || res.status === 404) {
      return true;
    }
    throw new Error(`DELETE failed for ${daPath}: ${res.status} ${res.statusText}`);
  }

  /**
   * Returns the current lastModified for a file via a HEAD request.
   * @param {string} org
   * @param {string} site
   * @param {string} daPath - e.g. /blog/post.html
   * @returns {Promise<number|null>}
   */
  async getRemoteLastModified(org, site, daPath) {
    const url = `${this.daAdmin}/source/${org}/${site}${daPath}`;
    const res = await this.fetch(url, { method: 'HEAD', headers: this.authHeader });
    if (res.status === 401) {
      throw new Error('Unauthorized: invalid or missing token');
    }
    if (!res.ok) {
      return null;
    }
    const lastModified = res.headers.get('last-modified');
    return lastModified ? new Date(lastModified).getTime() : null;
  }
}
