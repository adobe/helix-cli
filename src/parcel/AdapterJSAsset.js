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
const JSAsset = require('parcel-bundler/src/assets/JSAsset');

const PURE_JS_SCRIPTS = ['html.js', 'json.js', 'xml.js', 'svg.js', 'css.js', 'txt.js'];

/**
 * Adapts Pure-JS actions to the `helix-js` type so that it can be wrapped via the `HelixAsset.js`.
 */
class AdapterJSAsset extends JSAsset {
  async generate() {
    const gen = await super.generate();

    // check if it's a pure-JS action
    let isScript = false;
    for (let i = 0; i < PURE_JS_SCRIPTS.length; i += 1) {
      const ext = PURE_JS_SCRIPTS[i];
      if (this.basename === ext || this.basename.endsWith(`_${ext}`)) {
        isScript = true;
        break;
      }
    }

    // if this no, we're done.
    if (!isScript) {
      gen.type = 'js';
      return gen;
    }

    // otherwise it's a pure-JS action and we want to wrap it
    return [{
      type: 'helix-js',
      value: gen.js,
      sourceMap: gen.map,
    }];
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
