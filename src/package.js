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

const { makeLogger } = require('./log-common.js');
const yargsStatic = require('./yargs-static.js');

module.exports = function deploy() {
  let executor;

  return {
    set executor(value) {
      executor = value;
    },
    command: 'package',
    desc: 'Create Adobe I/O runtime packages',
    builder: (yargs) => {
      yargsStatic(yargs);
      // eslint-disable-next-line global-require
      yargs
        .option('force', {
          describe: 'Forces creation of packages even if the sources are not modified.',
          type: 'boolean',
          default: false,
        })
        .option('target', {
          alias: 'o',
          default: '.hlx/build',
          type: 'string',
          describe: 'Target directory for packaged actions',
        })
        .group(['force', 'target'], 'Package options')
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const PackageCommand = require('./package.cmd'); // lazy load the handler to speed up execution time
        executor = new PackageCommand(makeLogger(argv));
      }

      await executor
        .withTarget(argv.target)
        .withOnlyModified(!argv.force)
        .withStatic(argv.static)
        .run();
    },
  };
};
