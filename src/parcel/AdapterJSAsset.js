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

const JSAsset = require('parcel-bundler/src/assets/JSAsset');

/**
 * Adapts Pure-JS actions to the `helix-js` type so that it can be wrapped via the `HelixAsset.js`.
 */
class AdapterJSAsset extends JSAsset {
  async generate() {
    const gen = await super.generate();

    // if we dealing with a .pre.js, we're done.
    if (this.basename.endsWith('.pre.js')) {
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
}

module.exports = AdapterJSAsset;
