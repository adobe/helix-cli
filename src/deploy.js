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

const yargsOpenwhisk = require('./yargs-openwhisk.js');
const yargsFastly = require('./yargs-fastly.js');
const { makeLogger } = require('./log-common.js');

module.exports = function deploy() {
  let executor;

  return {
    set executor(value) {
      executor = value;
    },
    command: 'deploy',
    desc: 'Deploy packaged functions to Adobe I/O runtime',
    builder: (yargs) => {
      yargsOpenwhisk(yargs);
      yargsFastly(yargs);
      yargs
        .option('auto', {
          describe: 'Enable auto-deployment',
          type: 'boolean',
          default: false,
          demandOption: true,
        })
        .option('dry-run', {
          alias: 'dryRun',
          describe: 'List the actions that would be created, but do not actually deploy',
          type: 'boolean',
          default: false,
        })
        .option('loggly-host', {
          alias: 'logglyHost',
          describe: 'API Host for Log Appender',
          type: 'string',
          default: 'trieloff.loggly.com',
        })
        .option('loggly-auth', {
          alias: 'logglyAuth',
          describe: 'API Key for Log Appender ($HLX_LOGGLY_AUTH)',
          type: 'string',
          default: '',
        })
        .option('circleci-auth', {
          alias: 'circleciAuth',
          describe: 'API Key for CircleCI API ($HLX_CIRCLECI_AUTH)',
          type: 'string',
          default: '',
        })
        .option('target', {
          alias: 'o',
          default: '.hlx/build',
          type: 'string',
          describe: 'Target directory of created action packages.',
        })
        .option('default', {
          describe: 'Adds a default parameter to the function',
          type: 'string',
        })
        .option('dirty', {
          describe: 'Allows deploying a working copy with uncommitted changes (dangerous)',
          type: 'boolean',
          default: false,
        })
        .option('add', {
          describe: 'Adds missing strains to the config',
          type: 'string',
        })
        .option('package', {
          describe: 'Automatically create or update outdated action packages.',
          type: 'string',
          choices: ['auto', 'ignore', 'always'],
          default: 'auto',
        })
        .option('minify', {
          describe: 'Enables minification of the final action bundle.',
          type: 'boolean',
          default: false,
        })
        .option('svc-resolve-git-ref', {
          alias: 'svcResolveGitRef',
          describe: 'Service name for git-resolve-ref service',
          type: 'string',
          default: 'helix-services/resolve-git-ref@v1',
        })
        .array('default')
        .nargs('default', 2)
        .coerce('default', arg => arg.reduce((result, value, index, array) => {
          const res = {};
          if (index % 2 === 0) {
            res[value.toUpperCase()] = array[index + 1];
          }
          return Object.assign(res, result);
        }, {}))
        .group(['auto', 'wsk-auth', 'wsk-namespace', 'default', 'dirty'], 'Deployment Options')
        .group(['wsk-host', 'loggly-host', 'loggly-auth', 'target'], 'Advanced Options')
        .group(['package', 'minify', 'target'], 'Package options')
        .check((args) => {
          if (!args.auto) {
            // single-shot deployment is easy
            return true;
          }
          const message = 'Auto-deployment requires: ';
          const missing = [];
          if (!args.circleciAuth) {
            missing.push('--circleci-auth');
          }
          if (!args.fastlyAuth) {
            missing.push('--fastly-auth');
          }
          if (!args.fastlyNamespace) {
            missing.push('--fastly-namespace');
          }
          if (!args.wskAuth) {
            missing.push('--wsk-auth');
          }
          if (!args.wskNamespace) {
            missing.push('--wsk-namespace');
          }
          if (!args.wskHost) {
            missing.push('--wsk-host');
          }
          if (missing.length === 0) {
            return true;
          }
          return new Error(message + missing.join(', '));
        })
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const DeployCommand = require('./deploy.cmd'); // lazy load the handler to speed up execution time
        executor = new DeployCommand(makeLogger(argv));
      }

      await executor
        .withEnableAuto(argv.auto)
        .withEnableDirty(argv.dirty)
        .withWskAuth(argv.wskAuth)
        .withWskHost(argv.wskHost)
        .withWskNamespace(argv.wskNamespace)
        .withLogglyHost(argv.logglyHost)
        .withLogglyAuth(argv.logglyAuth)
        .withTarget(argv.target)
        .withDefault(argv.default)
        .withDryRun(argv.dryRun)
        .withCircleciAuth(argv.circleciAuth)
        .withFastlyAuth(argv.fastlyAuth)
        .withFastlyNamespace(argv.fastlyNamespace)
        .withCreatePackages(argv.package)
        .withAddStrain(argv.add)
        .withMinify(argv.minify)
        .withResolveGitRefService(argv.svcResolveGitRef)
        .run();
    },

  };
};
