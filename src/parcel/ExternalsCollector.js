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

const scopedModuleRegex = new RegExp('@[a-zA-Z0-9][\\w-.]+/[a-zA-Z0-9][\\w-.]+([a-zA-Z0-9./]+)?', 'g');

function getModuleName(request) {
  const req = request.replace(/^.*?\/node_modules\//, '');
  if (scopedModuleRegex.test(req)) {
    // reset regexp
    scopedModuleRegex.lastIndex = 0;
    return req.split('/', 2).join('/');
  }
  return req.split('/')[0];
}

/**
 * Helper class that collects external modules from a script. Ideally, we could collect the external
 * dependencies directly in parcel, but this is due to its architecture not possible.
 */
class ExternalsCollector {
  constructor() {
    this._cwd = process.cwd();
    this._outputFile = '';
  }

  withDirectory(d) {
    this._cwd = d;
    return this;
  }

  withOutputFile(output) {
    this._outputFile = output;
    return this;
  }

  async collectModules(file) {
    const externals = {};
    const filename = path.resolve(this._cwd, `${file}.collector.tmp`);
    const compiler = webpack({
      target: 'node',
      mode: 'development',
      entry: file,
      output: {
        path: this._cwd,
        filename: path.relative(this._cwd, filename),
        library: 'main',
        libraryTarget: 'umd',
      },
      devtool: false,
      externals: [(context, req, callback) => {
        // console.log('context', context, 'req', req);

        const moduleName = getModuleName(req);
        // console.log('module: ' + moduleName);
        if (!moduleName) {
          return callback();
        }
        if (moduleName !== '.') {
          externals[moduleName] = true;
        }
        // return callback();
        return callback(null, `commonjs ${req}`);
      }],
    });

    const ext = await new Promise((resolve, reject) => {
      compiler.run((err) => {
        if (err) {
          reject(err);
          return;
        }
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
