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
const fs = require('fs-extra');
const webpack = require('webpack');

const nodeModulesRegex = new RegExp('(.*/node_modules/)((@[^/]+/)?([^/]+)).*');

/**
 * Helper class that collects external modules from a script. Ideally, we could collect the external
 * dependencies directly in parcel, but this is due to its architecture not possible.
 */
class ExternalsCollector {
  constructor() {
    this._cwd = process.cwd();
    this._outputFile = '';
    this._excludes = new Set();
  }

  withDirectory(d) {
    this._cwd = d;
    return this;
  }

  withExternals(ext) {
    this._excludes = new Set(ext);
    return this;
  }

  withOutputFile(output) {
    this._outputFile = output;
    return this;
  }

  async collectModules(files) {
    const externals = {};
    const filename = path.resolve(this._cwd, `${files[0]}.collector.tmp`);
    const compiler = webpack({
      target: 'node',
      mode: 'development',
      entry: files,
      output: {
        path: this._cwd,
        filename: path.relative(this._cwd, filename),
        library: 'main',
        libraryTarget: 'umd',
      },
      resolve: {
        modules: [path.resolve(__dirname, '..', '..', 'node_modules'), 'node_modules'],
      },
      devtool: false,
    });

    const ext = await new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          reject(err);
          return;
        }
        stats.compilation.modules.forEach((mod) => {
          if (mod.resource) {
            const m = nodeModulesRegex.exec(mod.resource);
            const modName = m ? m[2] : null;
            if (modName && !this._excludes.has(modName)) {
              const modPath = m[1] + modName;
              // for duplicate mods, take the "more toplevel" one
              if (!externals[modName] || modPath.length < externals[modName].length) {
                externals[modName] = modPath;
              }
            }
          }
        });
        resolve(externals);
      });
    });
    await fs.remove(filename);

    if (this._outputFile) {
      await fs.writeFile(this._outputFile, JSON.stringify({ requires: ext }, null, '  '), 'utf-8');
    }
    return ext;
  }
}

module.exports = ExternalsCollector;
