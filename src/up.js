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
const { getOrCreateLogger } = require('./log-common.js');

module.exports = function up() {
  let executor;
  return {
    set executor(value) {
      executor = value;
    },
    command: 'up',
    description: 'Run a Helix development server',
    builder: (yargs) => {
      yargs
        .option('open', {
          describe: 'Open a browser window at specified path',
          type: 'string',
          default: '/',
        })
        .option('no-open', {
          // negation of the open option (resets open default)
          // see https://github.com/yargs/yargs/blob/master/docs/tricks.md#negating-boolean-arguments
          alias: 'noOpen',
          describe: 'Disable automatic opening of browser window',
          type: 'boolean',
        })
        .option('livereload', {
          describe: 'Enable automatic reloading of modified sources in browser.',
          type: 'boolean',
          default: true,
        })
        .option('no-livereload', {
          // negation of the livereload option (resets open default)
          // see https://github.com/yargs/yargs/blob/master/docs/tricks.md#negating-boolean-arguments
          alias: 'noLiveReload',
          describe: 'Disable live-reload',
          type: 'boolean',
        })
        .option('port', {
          describe: 'Start development server on port',
          type: 'int',
          default: 3000,
        })
        .group(['port'], 'Server options')
        .option('pages-url', {
          alias: 'pagesUrl',
          describe: 'The origin url to fetch pages content from.',
          type: 'string',
        })
        .group(['pages-url', 'livereload', 'no-livereload', 'open', 'no-open'], 'Helix Pages Options')

        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const UpCommand = require('./up.cmd'); // lazy load the handler to speed up execution time
        executor = new UpCommand(getOrCreateLogger(argv));
      }
      await executor
        .withHttpPort(argv.port)
        // only open  browser window when executable is `hlx`
        // this prevents the window to be opened during integration tests
        .withOpen(path.basename(argv.$0) === 'hlx' ? argv.open : false)
        .withLiveReload(argv.livereload)
        .withPagesUrl(argv.pagesUrl)
        .run();
    },
  };
};
