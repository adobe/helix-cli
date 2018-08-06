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

const NAME_PARAM = 'name';
const DIR_PARAM = 'dir';

module.exports = function init() {
  let executor;

  return {
    set executor(value) {
      executor = value;
    },
    command: `init <${NAME_PARAM}> [${DIR_PARAM}]`,
    desc: 'Initialize the project structure',
    builder: (yargs) => {
      yargs
        .positional(NAME_PARAM, {
          type: 'string',
          describe: 'Name of the project to initialize',
        })
        .positional(DIR_PARAM, {
          type: 'string',
          describe: 'Parent directory of new project',
          default: '.',
        })
        .strict();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const InitCommand = require('./init.cmd'); // lazy load the handler to speed up execution time
        executor = new InitCommand();
      }

      await executor
        .withDirectory(argv.dir)
        .withName(argv.name)
        .run();
    },
  };
};
