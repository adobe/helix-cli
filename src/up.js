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
        .option('host', {
          describe: 'Override request.host',
          type: 'string',
        })
        .option('local-repo', {
          alias: 'localRepo',
          describe: 'Emulates a GitHub repository for the specified git repository.',
          type: 'string',
          array: true,
          default: [],
        })
        // allow for comma separated values
        .coerce('localRepo', (value) => value.reduce((acc, curr) => {
          if (curr === false) {
            // do nothing
          } else if (!curr) {
            acc.push('.');
          } else {
            acc.push(...curr.split(/\s*,\s*/));
          }
          return acc;
        }, []))
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
        .group(['port', 'open', 'host', 'local-repo'], 'Server options')
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const UpCommand = require('./up.cmd'); // lazy load the handler to speed up execution time
        executor = new UpCommand(makeLogger(argv));
      }

      await executor
        .withTargetDir(argv.target)
        .withFiles(argv.files)
        .withOverrideHost(argv.host)
        .withSaveConfig(argv.saveConfig)
        .withHttpPort(argv.port)
        .withLocalRepo(argv.localRepo)
        .withDevDefault(argv.devDefault)
        // only open browser window when executable is `hlx`
        // this prevents the window to be opened during integration tests
        .withOpen(argv.open && path.basename(argv.$0) === 'hlx')
        .run();
    },
  };
};
