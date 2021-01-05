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

module.exports = function commonArgs(yargs) {
  return yargs
    .option('target', {
      alias: 'o',
      default: '.hlx/build',
      describe: 'Target directory for compiled JS',
    })
    .option('custom-pipeline', {
      alias: 'customPipeline',
      describe: 'Specify the pipeline to use, string representing a npm install dependency',
      type: 'string',
      default: '',
    })
    .option('universal', {
      describe: 'Generate an universal bundle instead of an on openwhisk action.',
      type: 'boolean',
      default: false,
    })
    .positional('files', {
      describe: 'The template files to compile',
      default: ['src/**/*.htl', 'src/**/*.js', 'src/**/*.jsx', 'cgi-bin/**/*.js'],
      array: true,
      type: 'string',
    })
    // allow for comma separated values
    .coerce('files', (value) => value.reduce((acc, curr) => {
      acc.push(...curr.split(/\s*,\s*/));
      return acc;
    }, []));
};
