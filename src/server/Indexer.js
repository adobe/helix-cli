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
import { resolve } from 'path';
import { IndexConfig } from '@adobe/helix-shared-config';
import { indexResource, contains } from '@adobe/helix-shared-indexer';
import chalk from 'chalk-template';
import chokidar from 'chokidar';

export default class Indexer {
  constructor() {
    this._cwd = process.cwd();
    this._logger = null;
    this._last = {};
    this._index = null;
    this._printIndex = false;
  }

  withCwd(cwd) {
    this._cwd = cwd;
    return this;
  }

  withLogger(logger) {
    this._logger = logger;
    return this;
  }

  withPrintIndex(value) {
    this._printIndex = value;
    return this;
  }

  get log() {
    return this._logger;
  }

  async init() {
    await this.loadIndex();
    // eslint-disable-next-line no-underscore-dangle
    this._watcher = chokidar.watch([resolve(this._cwd, this._index._name)], {
      persistent: true,
      ignoreInitial: true,
    });

    this._watcher.on('all', async () => {
      await this.loadIndex();
      await this.onIndexChanged();
    });
    return this;
  }

  async close() {
    if (this._watcher) {
      await this._watcher.close();
      delete this._watcher;
    }
  }

  async loadIndex() {
    const { log } = this;
    try {
      this._index = await new IndexConfig()
        .withDirectory(this._cwd)
        .withLogger(log)
        .init();
    } catch (e) {
      log.error(`Error in helix-query.yaml: ${e.message}`);
    }
    if (this._printIndex && this._index.indices.length === 0) {
      log.warn(chalk`AEM CLI started with {gray --print-index} but no valid {gray helix-query.yaml} found.`);
    }
  }

  async onData(url, response) {
    const { pathname } = new URL(url);
    this._last = {
      pathname,
      response,
    };
    if (this._printIndex) {
      await this.dump();
    }
  }

  async onIndexChanged() {
    await this.loadIndex();
    if (this._printIndex) {
      await this.dump();
    }
  }

  async dump() {
    const { log } = this;
    const {
      pathname,
      response,
    } = this._last;
    if (!pathname) {
      log.debug('No last path recorded, dump skipped.');
      return;
    }
    const records = await this.getRecords(pathname, response);
    if (records) {
      if (records.length) {
        log.info(chalk`Index information for {blue ${pathname}}`);
      } else {
        log.info(chalk`No index information matches {blue ${pathname}}`);
      }
      for (const idx of records) {
        log.info(chalk`Index: {yellow ${idx.name}}`);
        const pad = Object.keys(idx.properties).reduce((p, c) => Math.max(p, c.length), 0);
        Object.entries(idx.properties).forEach(([key, value]) => {
          if (typeof value === 'number') {
            // eslint-disable-next-line no-param-reassign
            value = chalk`{yellow ${value}}`;
          } else {
            // eslint-disable-next-line no-param-reassign
            value = JSON.stringify(value);
          }
          log.info(chalk`  {gray ${key.padStart(pad)}}: ${value}`);
        });
      }
    }
  }

  async getRecords(pathname, response) {
    if (!this._index) {
      return null;
    }
    return this._index.indices
      .map((config) => {
        if (contains(config, pathname)) {
          return {
            name: config.name,
            properties: indexResource(pathname, response, config, this.log),
          };
        } else {
          return null;
        }
      })
      .filter((r) => !!r);
  }
}
