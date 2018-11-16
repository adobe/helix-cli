/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const JSPackager = require('parcel-bundler/src/packagers/JSPackager');

const path = require('path');
const fs = require('fs-extra');
const ExternalsCollector = require('./ExternalsCollector');

/**
 * Parcel packager that extracts the raw source and uses the `ExternalsCollector` to retrieve the
 * external modules. Ideally this should be achieved to use parcel alone, but this is currently
 * not possible, because the externals module rejection happens deep inside the JS parse tree.
 */
class TrackingPackager extends JSPackager {
  constructor(bundle, bundler) {
    super(bundle, bundler);
    this._raw = [];
  }

  async writeModule(id, code, deps = {}, map) {
    await super.writeModule(id, code, deps, map);

    const tmpfile = path.resolve(this.bundle.name, '..', `${id}.raw`);
    await fs.writeFile(tmpfile, code, 'utf-8');
    this._raw.push(tmpfile);
  }

  async end() {
    await super.end();

    const exts = await Promise.all(this._raw.map((raw) => {
      const c = new ExternalsCollector()
        .withDirectory(path.resolve(this.bundle.name, '..'));
      return c.collectModules(raw);
    }));

    const mods = {
      requires: exts.reduce((c, m) => Object.assign(c, m), {}),
    };
    // console.log('xternals', mods);

    await fs.writeFile(`${this.bundle.name}.json`, JSON.stringify(mods, null, '  '), 'utf-8');
    await Promise.all(this._raw.map(file => fs.remove(file)));
  }
}

module.exports = TrackingPackager;
