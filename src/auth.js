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

'use strict';

/* eslint global-require: off */

const { makeLogger } = require('./log-common.js');

module.exports = function auth() {
  let executor;
  return {
    set executor(value) {
      executor = value;
    },
    command: 'auth',
    desc: 'Authenticate against 3rd party systems for development and deployment',
    builder: (yargs) => {
      yargs
        .option('github', {
          boolean: true,
          default: true,
          describe: 'Run authentication wizard for GitHub.',
        })
        .group(['github'/* , 'fastly', 'wsk' */], 'Services')
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const BuildCommand = require('./auth.cmd'); // lazy load the handler to speed up execution time
        executor = new BuildCommand(makeLogger(argv));
      }

      await executor
        .run();
    },
  };
};
