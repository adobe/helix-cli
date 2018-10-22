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

/* eslint no-console: off */
/* eslint global-require: off */

const path = require('path');
const { defaultArgs } = require('./defaults.js');
const { logArgs } = require('./log-common.js');

module.exports = function up() {
  let executor;
  return {
    set executor(value) {
      executor = value;
    },
    command: 'up [files...]',
    description: 'Run a Helix development server',
    builder: (yargs) => {
      defaultArgs(yargs);
      logArgs(yargs)
        .option('open', {
          describe: 'Open a browser window',
          boolean: true,
          type: 'boolean',
          default: true,
        }).help();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const UpCommand = require('./up.cmd'); // lazy load the handler to speed up execution time
        executor = new UpCommand();
      }


      await executor
        .withCacheEnabled(argv.cache)
        .withMinifyEnabled(argv.minify)
        .withTargetDir(argv.target)
        .withFiles(argv.files)
        // only open browser window when executable is `hlx`
        // this prevents the window to be opened during integration tests
        .withOpen(argv.open && path.basename(argv.$0) === 'hlx')
        .run();
    },
  };
};
