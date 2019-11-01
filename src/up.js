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
const yargsBuild = require('./yargs-build.js');
const yargsParams = require('./yargs-params.js');
const { makeLogger } = require('./log-common.js');

module.exports = function up() {
  let executor;
  return {
    set executor(value) {
      executor = value;
    },
    command: 'up [files...]',
    description: 'Run a Helix development server',
    builder: (yargs) => {
      yargsBuild(yargs);
      yargsParams(yargs, {
        name: 'dev-default',
        describe: 'Additional action parameters',
        alias: ['devDefault'],
        type: 'array',
        default: [],
      });
      yargs
        .option('open', {
          describe: 'Open a browser window',
          type: 'boolean',
          default: true,
        })
        .option('no-open', {
          // negation of the open option (resets open default)
          // see https://github.com/yargs/yargs/blob/master/docs/tricks.md#negating-boolean-arguments
          alias: 'noOpen',
          describe: 'Disable automatic opening of browser window',
          type: 'boolean',
        })
        .option('host', {
          describe: 'Override request.host',
          type: 'string',
        })
        .option('local-repo', {
          alias: 'localRepo',
          describe: 'Emulates a GitHub repository for the specified local git repository.',
          type: 'string',
          array: true,
        })
        // allow for comma separated values
        .coerce('localRepo', (value) => value.reduce((acc, curr) => {
          if (curr === false) {
            // --no-local-repo specified: add a dummy entry
            acc.push(null);
          } else {
            acc.push(...curr.split(/\s*,\s*/));
          }
          return acc;
        }, []))
        .option('no-local-repo', {
          // negation of the local-repo option (resets local-repo default)
          // see https://github.com/yargs/yargs/blob/master/docs/tricks.md#negating-boolean-arguments
          alias: 'noLocalRepo',
          describe: 'Ignore local checkout, always fetch from GitHub',
          type: 'boolean',
        })
        .option('save-config', {
          alias: 'saveConfig',
          describe: 'Saves the default config.',
          type: 'boolean',
          default: false,
        })
        .option('port', {
          describe: 'Start development server on port',
          type: 'int',
          default: 3000,
        })
        .group(['port', 'open', 'no-open', 'host', 'local-repo', 'no-local-repo'], 'Server options')
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const UpCommand = require('./up.cmd'); // lazy load the handler to speed up execution time
        executor = new UpCommand(makeLogger(argv));
      }

      const { localRepo } = argv;
      if (Array.isArray(localRepo)) {
        if (!localRepo.length) {
          // --local-repo option has been specified without value: use ['.'] as default
          localRepo.push('.');
        } else if (localRepo.length === 1 && localRepo[0] === null) {
          // --no-local-repo option has been specified: remove dummy entry
          localRepo.pop();
        }
      }
      await executor
        .withTargetDir(argv.target)
        .withFiles(argv.files)
        .withOverrideHost(argv.host)
        .withSaveConfig(argv.saveConfig)
        .withHttpPort(argv.port)
        .withLocalRepo(localRepo)
        .withDevDefault(argv.devDefault)
        // only open browser window when executable is `hlx`
        // this prevents the window to be opened during integration tests
        .withOpen(argv.open && path.basename(argv.$0) === 'hlx')
        .run();
    },
  };
};
