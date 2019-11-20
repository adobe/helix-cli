/*
 * Copyright 2019 Adobe. All rights reserved.
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
const webpack = require('webpack');

/**
 * Helper class that packs the script into 1 bundle using webpack.
 */
class ActionBundler {
  constructor() {
    this._cwd = process.cwd();
    this._modulesPaths = ['node_modules'];
    this._minify = true;
    this._logger = console;
    this._progressHandler = null;
  }

  withDirectory(d) {
    this._cwd = d;
    return this;
  }

  withLogger(value) {
    this._logger = value;
    return this;
  }

  withModulePaths(value) {
    this._modulesPaths = value;
    return this;
  }

  withMinify(value) {
    this._minify = value;
    return this;
  }

  withProgressHandler(value) {
    this._progressHandler = value;
    return this;
  }

  async run(scripts) {
    const files = {};
    scripts.forEach((s) => {
      const moduleName = path.relative(this._cwd, s.bundlePath);
      files[moduleName] = s.main;
    });

    const options = {
      target: 'node',
      mode: 'none',
      entry: files,
      cache: true,
      output: {
        path: this._cwd,
        filename: '[name]',
        library: 'main',
        libraryTarget: 'umd',
      },
      externals: [],
      resolve: {
        mainFields: ['main', 'module'],
        extensions: ['.wasm', '.js', '.mjs', '.json'],
        modules: this._modulesPaths,
      },
      devtool: false,
      optimization: {
        minimize: this._minify,
      },
      plugins: [],
    };

    if (this._progressHandler) {
      options.plugins.push(new webpack.ProgressPlugin(this._progressHandler));
    }

    const compiler = webpack(options);

    const ignoredWarnings = [{
      message: /Critical dependency: the request of a dependency is an expression/,
      resource: '/@babel/core/lib/config/files/configuration.js',
    }, {
      message: /Critical dependency: the request of a dependency is an expression/,
      resource: '/@babel/core/lib/config/files/plugins.js',
    }, {
      message: /Critical dependency: the request of a dependency is an expression/,
      resource: '/@babel/core/lib/config/files/plugins.js',
    }, {
      message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      resource: '/@adobe/htlengine/src/compiler/Compiler.js',
    }, {
      message: /Critical dependency: the request of a dependency is an expression/,
      resource: '/@adobe/htlengine/src/runtime/Runtime.js',
    }, {
      message: /^Module not found: Error: Can't resolve 'bufferutil'/,
      resource: '/ws/lib/buffer-util.js',
    }, {
      message: /^Module not found: Error: Can't resolve 'utf-8-validate'/,
      resource: '/ws/lib/validation.js',
    }, {
      message: /^Module not found: Error: Can't resolve '\.\/src\/build'/,
      resource: '/dtrace-provider/dtrace-provider.js',
    }];

    const ignoredErrors = [{
      message: /^Module not found: Error: Can't resolve 'canvas'/,
      resource: '/jsdom/lib/jsdom/utils.js',
    }];

    const matchWarning = (rules) => (w) => {
      const msg = w.message;
      const res = w.module.resource;
      return !rules.find((r) => {
        if (!res.endsWith(r.resource)) {
          return false;
        }
        return r.message.test(msg);
      });
    };

    return new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          reject(err);
          return;
        }

        // filter out the expected warnings and errors
        // eslint-disable-next-line no-param-reassign,max-len
        stats.compilation.warnings = stats.compilation.warnings.filter(matchWarning(ignoredWarnings));
        // eslint-disable-next-line no-param-reassign
        stats.compilation.errors = stats.compilation.errors.filter(matchWarning(ignoredErrors));

        if (stats.hasErrors() || stats.hasWarnings()) {
          resolve(stats.toJson({
            errorDetails: false,
          }));
          return;
        }
        resolve({});
      });
    });
  }
}

module.exports = ActionBundler;
