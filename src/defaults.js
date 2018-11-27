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
const DEFAULT_PATTERNS = ['src/**/*.htl', 'src/**/*.js'];

// const DEFAULT_PATTERNS = ['html', 'json', 'xml', 'svg', 'css', 'txt'].reduce((globs, ext) => {
//   globs.push(`src/**/${ext}.js`);        // pure-js functions
//   globs.push(`src/**/*_${ext}.js`);      // pure-js functions with selector
//   return globs;
// }, ['src/**/*.htl', 'src/**/*.pre.js']);

console.log(DEFAULT_PATTERNS);

module.exports.defaultArgs = yargs => yargs
  .option('target', {
    alias: 'o',
    default: '.hlx/build',
    describe: 'Target directory for compiled JS',
  })
  .option('cache', {
    describe: 'Enable or disable compile cache',
    boolean: true,
    default: false,
  })
  .option('minify', {
    describe: 'Minify JS',
    boolean: true,
    default: false,
  })
  .positional('files', {
    describe: 'The template files to compile',
    default: DEFAULT_PATTERNS,
    type: 'string',
  })
  .array('files');
