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

import globToRegExp from 'glob-to-regexp';
import { getFetch } from '../fetch-utils.js';

/**
 * Normalizes the request path for matching against metadata.json URL globs.
 * @param {string} pathname
 * @returns {string}
 */
export function normalizePathForMetadataMatch(pathname) {
  let p = pathname || '/';
  if (!p.startsWith('/')) {
    p = `/${p}`;
  }
  if (p.length > 5 && p.endsWith('.html')) {
    p = p.slice(0, -5);
  }
  return p || '/';
}

/**
 * @param {unknown} body
 * @returns {object[]}
 */
function extractDataRows(body) {
  if (!body || typeof body !== 'object') {
    return [];
  }
  const { data } = /** @type {{ data?: unknown }} */ (body);
  if (!Array.isArray(data)) {
    return [];
  }
  return /** @type {object[]} */ (data.filter((r) => r && typeof r === 'object'));
}

/**
 * @param {object[]} rows
 * @returns {Array<{ pattern: string, regex: RegExp, row: object }>}
 */
export function compileMetadataSheetPatterns(rows) {
  /** @type {Array<{ pattern: string, regex: RegExp, row: object }>} */
  const out = [];
  for (const row of rows) {
    const pattern = row.URL;
    if (typeof pattern !== 'string' || !pattern.trim()) {
      // eslint-disable-next-line no-continue
      continue;
    }
    try {
      const regex = globToRegExp(pattern, { globstar: true });
      out.push({ pattern, regex, row });
    } catch {
      // eslint-disable-next-line no-continue
      continue;
    }
  }
  return out;
}

/**
 * Merges all matching metadata sheet rows for a path: most specific URL pattern first,
 * then each field uses the first non-empty value (empty string falls through to broader rows).
 * @param {string} normalizedPath
 * @param {Array<{ pattern: string, regex: RegExp, row: object }>} compiled
 * @returns {Record<string, string> | null}
 */
export function mergeMetadataSheetRows(normalizedPath, compiled) {
  /** @type {Array<{ pattern: string, row: object }>} */
  const hits = [];
  for (const { pattern, regex, row } of compiled) {
    if (regex.test(normalizedPath)) {
      hits.push({ pattern, row });
    }
  }
  if (hits.length === 0) {
    return null;
  }
  hits.sort((a, b) => b.pattern.length - a.pattern.length);

  /** @type {Set<string>} */
  const keys = new Set();
  for (const { row } of hits) {
    for (const k of Object.keys(row)) {
      if (k !== 'URL' && !k.startsWith(':')) {
        keys.add(k);
      }
    }
  }

  /** @type {Record<string, string>} */
  const merged = {};
  for (const key of keys) {
    for (const { row } of hits) {
      const v = row[key];
      if (v === undefined || v === null) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const s = String(v).trim();
      if (s === '') {
        // eslint-disable-next-line no-continue
        continue;
      }
      merged[key] = s;
      break;
    }
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

export default class MetadataSheetSupport {
  /**
   * @param {{ proxyUrl: string, log: object, allowInsecure: boolean, siteToken?: string }} opts
   */
  constructor({
    proxyUrl, log, allowInsecure, siteToken,
  }) {
    this.url = new URL(proxyUrl);
    this.url.pathname = '/metadata.json';
    this.log = log;
    this.allowInsecure = allowInsecure;
    this.siteToken = siteToken || '';
    this.cookie = '';
    /** @type {Array<{ pattern: string, regex: RegExp, row: object }> | null} */
    this._compiled = null;
    /** @type {Promise<void> | null} */
    this._loadPromise = null;
  }

  setCookie(cookie) {
    const next = cookie || '';
    if (this.cookie !== next) {
      this.cookie = next;
      this._compiled = null;
      this._loadPromise = null;
    }
  }

  setSiteToken(siteToken) {
    const next = siteToken || '';
    if (this.siteToken !== next) {
      this.siteToken = next;
      this._compiled = null;
      this._loadPromise = null;
    }
  }

  invalidate() {
    this._compiled = null;
    this._loadPromise = null;
  }

  async ensureLoaded() {
    if (this._compiled !== null) {
      return;
    }
    if (this._loadPromise) {
      await this._loadPromise;
      return;
    }
    this._loadPromise = this._fetchAndCompile();
    try {
      await this._loadPromise;
    } finally {
      this._loadPromise = null;
    }
  }

  async _fetchAndCompile() {
    const headers = {};
    if (this.cookie) {
      headers.cookie = this.cookie;
    }
    if (this.siteToken) {
      headers.authorization = `token ${this.siteToken}`;
    }
    try {
      const resp = await getFetch(this.allowInsecure)(this.url, {
        cache: 'no-store',
        headers,
      });
      if (!resp.ok) {
        this.log.debug(`metadata.json not loaded (${resp.status}) from ${this.url}`);
        this._compiled = [];
        return;
      }
      const text = await resp.text();
      const body = JSON.parse(text);
      const rows = extractDataRows(body);
      this._compiled = compileMetadataSheetPatterns(rows);
      this.log.debug(`loaded metadata.json (${this._compiled.length} URL pattern(s)) from ${this.url}`);
    } catch (e) {
      this.log.debug(`metadata.json fetch/parse failed: ${e.message || e}`);
      this._compiled = [];
    }
  }

  /**
   * @param {string} pathname ctx.path or resource path with .html
   * @returns {object | null}
   */
  matchPath(pathname) {
    if (!this._compiled || this._compiled.length === 0) {
      return null;
    }
    const normalized = normalizePathForMetadataMatch(pathname);
    return mergeMetadataSheetRows(normalized, this._compiled);
  }
}
