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

const { getOrCreateLogger } = require('./log-common.js');

module.exports = function demo() {
  let executor;

  return {
    set executor(value) {
      executor = value;
    },
    command: 'demo <name> [dir]',
    desc: 'Create example helix project.',
    builder: (yargs) => {
      yargs
        .option('type', {
          describe: 'Demo source type',
          type: 'string',
          choices: ['simple', 'full'],
          default: 'simple',
        })
        .positional('name', {
          type: 'string',
          describe: 'Name of the project to create',
        })
        .positional('dir', {
          type: 'string',
          describe: 'Parent directory of new project',
          default: '.',
        })
        .env('NO_HLX_ENV_SUPPORT_FOR_DEMO')
        .strict();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const DemoCommand = require('./demo.cmd'); // lazy load the handler to speed up execution time
        executor = new DemoCommand(getOrCreateLogger(argv));
      }

      await executor
        .withDirectory(argv.dir)
        .withName(argv.name)
        .withType(argv.type)
        .run();
    },
  };
};
