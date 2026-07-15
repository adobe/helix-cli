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
    /** @type {object[] | null} raw metadata.json sheet rows, fed to helix-html-pipeline's own
     *   `fetchSourcedMetadata` step so it builds the sheet-based overrides itself */
    this._rows = null;
    /** @type {Promise<void> | null} */
    this._loadPromise = null;
  }

  setCookie(cookie) {
    const next = cookie || '';
    if (this.cookie !== next) {
      this.cookie = next;
      this._rows = null;
      this._loadPromise = null;
    }
  }

  setSiteToken(siteToken) {
    const next = siteToken || '';
    if (this.siteToken !== next) {
      this.siteToken = next;
      this._rows = null;
      this._loadPromise = null;
    }
  }

  invalidate() {
    this._rows = null;
    this._loadPromise = null;
  }

  async ensureLoaded() {
    if (this._rows !== null) {
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
        this._rows = [];
        return;
      }
      const text = await resp.text();
      const body = JSON.parse(text);
      this._rows = extractDataRows(body);
      this.log.debug(`loaded metadata.json (${this._rows.length} row(s)) from ${this.url}`);
    } catch (e) {
      this.log.debug(`metadata.json fetch/parse failed: ${e.message || e}`);
      this._rows = [];
    }
  }

  /**
   * @returns {object[]} raw metadata.json sheet rows, or an empty array if none were loaded
   */
  getRows() {
    return this._rows ?? [];
  }
}
