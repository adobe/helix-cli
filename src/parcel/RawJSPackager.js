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

const Packager = require('parcel-bundler/src/packagers/Packager');
const objectHash = require('parcel-bundler/src//utils/objectHash');

const path = require('path');
const fs = require('fs-extra');

/**
 * Parcel packager that writes the source code as-is to the target without adding any
 * transformation. It also creates a `.info.json` file that contains the dependencies of the
 * processed asset.
 *
 * For example:
 *
 * ```
 * {
 *   main: "html.js",
 *   requires: [
 *     "html.pre.js"
 *   ]
 * }
 * ```
 */
class RawJSPackager extends Packager {
  async setup() {
    await fs.ensureDir(path.dirname(this.bundle.name));
  }

  getSize() {
    return this._size || 0;
  }

  async start() {
    this.first = true;
    this.dedupe = new Map();
    this.bundleLoaders = new Set();
    this.externalModules = new Set();
  }

  async addAsset(asset) {
    // If this module is referenced by another JS bundle, it needs to be exposed externally.
    // In that case, don't dedupe the asset as it would affect the module ids that are referenced
    // by other bundles.
    const isExposed = !Array.from(asset.parentDeps).every((dep) => {
      const depAsset = this.bundler.loadedAssets.get(dep.parent);
      return this.bundle.assets.has(depAsset) || depAsset.type !== 'js';
    });

    if (!isExposed) {
      const key = this.dedupeKey(asset);
      if (this.dedupe.has(key)) {
        return;
      }

      // Don't dedupe when HMR is turned on since it messes with the asset ids
      if (!this.options.hmr) {
        this.dedupe.set(key, asset.id);
      }
    }

    const deps = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const [dep, mod] of asset.depAssets) {
      // For dynamic dependencies, list the child bundles to load along with the module id
      if (dep.dynamic) {
        const bundles = [this.getBundleSpecifier(mod.parentBundle)];
        // eslint-disable-next-line no-restricted-syntax
        for (const child of mod.parentBundle.siblingBundles) {
          if (!child.isEmpty) {
            bundles.push(this.getBundleSpecifier(child));
            this.bundleLoaders.add(child.type);
          }
        }

        bundles.push(mod.id);
        deps[dep.name] = bundles;
        this.bundleLoaders.add(mod.type);
      } else {
        deps[dep.name] = this.dedupe.get(this.dedupeKey(mod)) || mod.id;

        // If the dep isn't in this bundle, add it to the list of external modules to preload.
        // Only do this if this is the root JS bundle, otherwise they will have already been
        // loaded in parallel with this bundle as part of a dynamic import.
        if (!this.bundle.assets.has(mod)) {
          this.externalModules.add(mod);
          if (
            !this.bundle.parentBundle
            || this.bundle.isolated
            || this.bundle.parentBundle.type !== 'js'
          ) {
            this.bundleLoaders.add(mod.type);
          }
        }
      }
    }

    // handle source map
    const mapBundle = this.bundle.siblingBundlesMap.get('map');
    let code = asset.generated.js;
    if (mapBundle) {
      const mapName = path.relative(this.options.outDir, mapBundle.name);
      code = `${code}\n//# sourceMappingURL=${mapName}`;
    }

    // write file
    await fs.writeFile(this.bundle.name, code, 'utf-8');
    this._size = code.length;

    // write info
    const bundleDir = path.dirname(this.bundle.name);
    const info = {
      main: path.relative(this.options.outDir, this.bundle.name),
      requires: [],
    };
    // eslint-disable-next-line no-restricted-syntax
    for (const dep of asset.depAssets.values()) {
      info.requires.push(path.relative(bundleDir, path.resolve(bundleDir, dep.id)));
    }

    const infoName = path.resolve(bundleDir, `${path.basename(this.bundle.name, '.js')}.info.json`);
    await fs.writeJSON(infoName, info, { spaces: 2 });
  }

  // eslint-disable-next-line class-methods-use-this
  getBundleSpecifier(bundle) {
    const name = path.basename(bundle.name);
    if (bundle.entryAsset) {
      return [name, bundle.entryAsset.id];
    }

    return name;
  }

  // eslint-disable-next-line class-methods-use-this
  dedupeKey(asset) {
    // cannot rely *only* on generated JS for deduplication because paths like
    // `../` can cause 2 identical JS files to behave differently depending on
    // where they are located on the filesystem
    const deps = Array.from(asset.depAssets.values(), (dep) => dep.name).sort();
    return objectHash([asset.generated.js, deps]);
  }

  // eslint-disable-next-line class-methods-use-this,no-empty-function
  async end() {
  }
}

module.exports = RawJSPackager;
