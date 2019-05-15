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

/* eslint global-require: off */

const { makeLogger } = require('./log-common.js');

module.exports = function hack() {
  let executor;
  return {
    set executor(value) {
      executor = value;
    },
    command: 'hack [hackathon]',
    builder: (yargs) => {
      yargs
        .positional('hackathon', {
          describe: 'The hackathon to attend',
          default: '',
          array: false,
          type: 'string',
        })
        .option('open', {
          describe: 'Open a browser window',
          type: 'boolean',
          default: true,
        })
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const HackCommand = require('./hack.cmd'); // lazy load the handler to speed up execution time
        executor = new HackCommand(makeLogger(argv));
        executor.withHackathon(argv.hackathon);
        executor.withOpen(argv.open);
      }

      await executor
        .run();
    },
  };
};
