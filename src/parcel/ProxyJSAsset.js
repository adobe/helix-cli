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
const path = require('path');

/**
 * Simple override of the JSAsset that avoids adding locally imported files as dependencies.
 * This is needed together with the RawJSPackager to create independent source files.
 */
class ProxyJSAsset extends JSAsset {
  addDependency(name, opts) {
    // return;
    const isRelativeImport = /^[/~.]/.test(name);
    if (isRelativeImport) {
      // we mark the asset as dynamic so it won't get merged into this source.
      const resolved = path.resolve(path.dirname(this.name), name);
      super.addDependency(name, Object.assign({ dynamic: true, resolved }, opts));
    }
  }
}

module.exports = ProxyJSAsset;
