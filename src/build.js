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

'use strict';

/* eslint no-console: off */
// TODO: remove the following line
/* eslint no-unused-vars: off */

const Bundler = require('parcel-bundler');
const glob = require('glob');

const DEFAULT_OPTIONS = {
  watch: false,
  cacheDir: '.hlx/cache',
  target: 'node',
  logLevel: 3,
  detailedReport: true,
};

const DEFAULT_PATTERNS = ["src/*.htl"];

module.exports = {
  command: 'build [files..]',
  aliases: ['b'],
  desc: 'Compile the template functions and build package',
  builder: (yargs) => {
    yargs.option('target', {
      alias: 'o',
      default: '.hlx/build',
      describe: 'Target directory for compiled JS'
    })
    .option('no-cache', {
      describe: 'Disable compile cache',
      default: false,
      type: 'boolean'
    })
    .option('minify', {
      describe: 'Minify JS',
      default: false,
      type: 'boolean'
    })
    .positional('files', {
      describe: 'The template files to compile',
      default: DEFAULT_PATTERNS,
      type: 'string'
    })
    yargs.help()
  },
  handler: (argv) => {
    // override default options with command line arguments
    const myoptions = {
      ...DEFAULT_OPTIONS,
      cache: argv.cache,
      minify: argv.minify,
      outDir: argv.target,
    }

    // expand patterns from command line arguments
    const myfiles = argv.files.reduce((a, f) => {
      return [...a, ...glob.sync(f)];
    }, []);

    const bundler = new Bundler(['./src/html.htl'], myoptions);

    const bundle = bundler.bundle().then(r => console.log);
  },
};
