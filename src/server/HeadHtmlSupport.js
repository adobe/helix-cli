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
import { createHash } from 'crypto';
import { resolve } from 'path';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import { select } from 'hast-util-select';
import { fetch } from '../fetch-utils.js';

export default class HeadHtmlSupport {
  /**
   * prepares the dom tree for easy comparison. it hashes the nodes and stored them in
   * a `hash` property. It also removes all whitespace-empty text nodes.
   *
   * @param tree
   * @returns {string}
   */
  static hash(tree) {
    const h = createHash('sha1');

    const update = (obj, keys) => {
      keys.sort();
      for (const k of keys) {
        let v = obj[k];
        if (v !== undefined) {
          if (Array.isArray(v)) {
            v = JSON.stringify(v);
          }
          h.update(String(v));
        }
      }
    };

    update(tree, ['type', 'tagName', 'value']);
    if (tree.properties) {
      update(tree.properties, Object.keys(tree.properties));
    }

    if (tree.children) {
      for (let i = 0; i < tree.children.length; i += 1) {
        const child = tree.children[i];
        // remove empty text nodes
        if (child.type === 'text' && child.value.trim() === '') {
          tree.children.splice(i, 1);
          i -= 1;
        } else {
          h.update(HeadHtmlSupport.hash(child));
        }
      }
    }

    // eslint-disable-next-line no-param-reassign
    tree.hash = h.digest('base64');
    return tree.hash;
  }

  /**
   * Parses the html and returns the dom
   * @param {string} html
   * @returns {Promise<HastNode>}
   */
  static async toDom(html) {
    return unified()
      .use(rehypeParse, { fragment: true })
      .parse(html);
  }

  constructor({ proxyUrl, directory, log }) {
    this.remoteHtml = '';
    this.remoteDom = null;
    this.remoteStatus = 0;
    this.localHtml = '';
    this.localStatus = 0;
    this.url = new URL(proxyUrl);
    this.url.pathname = '/head.html';
    this.filePath = resolve(directory, 'head.html');
    this.log = log;
  }

  async loadRemote() {
    // load head from server
    const resp = await fetch(this.url, {
      cache: 'no-store',
    });
    this.remoteStatus = resp.status;
    if (resp.ok) {
      this.remoteHtml = (await resp.text()).trim();
      this.remoteDom = await HeadHtmlSupport.toDom(this.remoteHtml);
      HeadHtmlSupport.hash(this.remoteDom);
      this.log.debug('loaded remote head.html from from', this.url);
    } else {
      this.log.error(`error while loading head.html from ${this.url}: ${resp.status}`);
    }
  }

  async loadLocal() {
    try {
      this.localHtml = (await fs.readFile(this.filePath, 'utf-8')).trim();
      this.localStatus = 200;
      this.log.debug('loaded local head.html from from', this.filePath);
    } catch (e) {
      this.log.error(`error while loading local head.html from ${this.filePath}: ${e.code}`);
      this.localStatus = 404;
    }
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

  async replace(source) {
    if (!this.isModified) {
      this.log.trace('head.html ignored: not modified locally.');
      return source;
    }

    const $html = await unified()
      .use(rehypeParse)
      .parse(source);

    const $head = select('head', $html);
    if (!$head) {
      this.log.trace('head.html ignored: source html has no matching <head>...</head> pair.');
      return source;
    }

    const $dst = this.remoteDom;
    if (!$dst) {
      // inject local content and the end of the head
      const $last = $head.children[$head.children.length - 1];
      const to = $last.position.end.offset;
      return `${source.substring(0, to)}${this.localHtml}${source.substring(to)}`;
    }

    // find remote head elements in source head
    HeadHtmlSupport.hash($head);
    const srcLen = $head.children.length;
    const dstLen = $dst.children.length;

    let $first;
    let $last;
    for (let s = 0; !$last && s <= srcLen - dstLen; s += 1) {
      $first = $head.children[s];
      for (let d = 0; d < dstLen; d += 1) {
        $last = $head.children[s + d];
        if ($last.hash !== $dst.children[d].hash) {
          $last = null;
          break;
        }
      }
    }

    if (!$last) {
      this.log.debug('head.html ignored: remote not found in HTML.');
      return source;
    }

    const from = $first.position.start.offset;
    const to = $last.position.end.offset;
    return `${source.substring(0, from)}${this.localHtml}${source.substring(to)}`;
  }
}
