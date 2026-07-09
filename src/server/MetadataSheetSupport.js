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
import { Modifiers } from '../content/html-pipeline-internals.js';

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
 * Builds a `Modifiers` instance (the same class `helix-html-pipeline` uses to resolve
 * sheet-based metadata overrides in production) from raw metadata.json sheet rows.
 * @param {object[]} rows
 * @returns {Modifiers}
 */
export function buildMetadataModifiers(rows) {
  return Modifiers.fromModifierSheet(rows);
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
    /** @type {Modifiers | null} */
    this._modifiers = null;
    /** @type {Promise<void> | null} */
    this._loadPromise = null;
  }

  setCookie(cookie) {
    const next = cookie || '';
    if (this.cookie !== next) {
      this.cookie = next;
      this._modifiers = null;
      this._loadPromise = null;
    }
  }

  setSiteToken(siteToken) {
    const next = siteToken || '';
    if (this.siteToken !== next) {
      this.siteToken = next;
      this._modifiers = null;
      this._loadPromise = null;
    }
  }

  invalidate() {
    this._modifiers = null;
    this._loadPromise = null;
  }

  async ensureLoaded() {
    if (this._modifiers !== null) {
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
        this._modifiers = Modifiers.EMPTY;
        return;
      }
      const text = await resp.text();
      const body = JSON.parse(text);
      const rows = extractDataRows(body);
      this._modifiers = buildMetadataModifiers(rows);
      this.log.debug(`loaded metadata.json (${rows.length} row(s)) from ${this.url}`);
    } catch (e) {
      this.log.debug(`metadata.json fetch/parse failed: ${e.message || e}`);
      this._modifiers = Modifiers.EMPTY;
    }
  }

  /**
   * @returns {Modifiers} the sheet-based metadata modifiers, matched by URL pattern the same
   *   way production resolves them (`Modifiers.getModifiers(path)`)
   */
  getModifiers() {
    return this._modifiers ?? Modifiers.EMPTY;
  }
}
