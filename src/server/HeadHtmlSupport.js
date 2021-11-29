/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import fs from 'fs/promises';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';
import { fetch } from '../fetch-utils.js';

export default class HeadHtmlSupport {
  constructor({ proxyUrl, directory, log }) {
    this.remoteHtml = '';
    this.remoteStatus = 0;
    this.localHtml = '';
    this.localStatus = 0;
    this.url = `${proxyUrl}/head.html`;
    this.filePath = resolve(directory, 'head.html');
    this.log = log;
  }

  async loadRemote() {
    // load head from server
    const resp = await fetch(this.url, {
      cache: 'no-store',
    });
    this.remoteHtml = this.sanitize(await resp.text());
    this.remoteStatus = resp.status;
    if (resp.ok) {
      this.log.debug('loaded remote head.html from from', this.url);
    } else {
      this.log.error(`error while loading head.html from ${this.url}: ${resp.status}`);
    }
  }

  async loadLocal() {
    try {
      this.localHtml = this.sanitize(await fs.readFile(this.filePath, 'utf-8'));
      this.localStatus = 200;
      this.log.debug('loaded local head.html from from', this.filePath);
    } catch (e) {
      this.log.error(`error while loading local head.html from ${this.filePath}: ${e.code}`);
      this.localStatus = 404;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  sanitize(html) {
    // do the same as the pipeline-service does when injecting the head.html
    const dom = new JSDOM('<html><head></head></html>');
    const doc = dom.window.document;
    const $headHtml = doc.createElement('template');
    $headHtml.innerHTML = html;
    doc.head.appendChild($headHtml.content);
    return doc.head.innerHTML.trim();
  }

  async init() {
    if (!this.localStatus) {
      await this.loadLocal();
    }
    if (!this.remoteStatus) {
      await this.loadRemote();
    }
    this.isModified = this.localStatus === 200
      && this.remoteStatus === 200
      && this.localHtml !== this.remoteHtml;
  }

  replace(source) {
    if (!this.isModified) {
      this.log.trace('head.html ignored: not modified locally.');
      return source;
    }

    // only search the head withing `<head>` in order to avoid false replacements
    const start = source.match(/<head>/i);
    const end = source.match(/<\/head>/i);
    if (!start || !end) {
      this.log.trace('head.html ignored: source html has no matching <head>...</head> pair.');
      return source;
    }

    const idx = source.lastIndexOf(this.remoteHtml, end.index);
    if (idx < 0) {
      this.log.debug('head.html ignored: remote not found in HTML.');
      return source;
    }

    if (idx < start.index || idx > end.index) {
      this.log.debug('head.html ignored: match outside <head>...</head> pair.', start.index, idx, end.index);
      return source;
    }

    return `${source.substring(0, idx)}${this.localHtml}${source.substring(idx + this.remoteHtml.length)}`;
  }
}
