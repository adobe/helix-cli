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

const path = require('path');
const { flat, into } = require('ferrum');
const JSAsset = require('parcel-bundler/src/assets/JSAsset');

const PURE_EXTENSIONS = ['html', 'json', 'xml', 'svg', 'css', 'txt'];
const PURE_TEMPLATES = ['js', 'jsx'];

/**
 * Adapts Pure-JS actions to the `helix-js` type so that it can be wrapped via the `HelixAsset.js`.
 */
class AdapterJSAsset extends JSAsset {
  /**
   * Determines if the given file should be treated as an AdapterJSAsset
   * @param {string} basename
   */
  static isPureScript(basename) {
    // create pairwise combinations of extension and template name
    const exts = into(flat(PURE_EXTENSIONS
      .map(ext => PURE_TEMPLATES
        .map(template => `${ext}.${template}`))), Array);
    // use early termination, so that the rest of the statement doesn't
    // have to be evaluated once the first match has been found.
    const matches = exts.reduce((match, ext) => match
      || basename === ext
      || basename.endsWith(`_${ext}`), false);
    return matches;
  }

  async getPackage() {
    const pkg = await super.getPackage() || {};
    const pack = pkg.devDependencies ? pkg : Object.assign(pkg, {
      devDependencies: {
        hyperapp: '*',
      },
    });
    pack.devDependencies.hyperapp = '*';
    return pack;
  }

  async generate() {
    const gen = await super.generate();

    // check if it's a pure-JS action
    const isScript = AdapterJSAsset.isPureScript(this.basename);

    // if this no, we're done.
    if (!isScript) {
      return gen;
    }

    // check if code is already wrapped (there is currently no other way to make this simple,
    // w/o implementing new extension in parcel).
    if (gen[0].value.indexOf('function helix_wrap_action') > 0) {
      return gen;
    }

    // inject hyperscript library
    if (this.basename.endsWith('.jsx')) {
      gen[0].value = `const h = require('hyperscript');\n${gen[0].value}`;
    }
    // otherwise it's a pure-JS action and we want to wrap it
    gen[0].type = 'helix-js';
    return gen;
  }

  addDependency(name, opts) {
    // return;
    const isRelativeImport = /^[/~.]/.test(name);
    if (isRelativeImport) {
      try {
        const resolved = require.resolve(name, {
          paths: [
            path.dirname(this.name),
          ],
        });
        // we mark the asset as dynamic so it won't get merged into this source.
        super.addDependency(name, Object.assign({ dynamic: true, resolved }, opts));
      } catch (e) {
        // the exact stack trace is not relevant to the end user.
        e.stack = null;
        throw e;
      }
    }
  }
}

module.exports = AdapterJSAsset;
