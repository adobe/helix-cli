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

module.exports = function deploy() {
  let executor;

  return {
    set executor(value) {
      executor = value;
    },
    command: 'deploy',
    desc: 'Deploy packaged functions to Adobe I/O runtime',
    builder: (yargs) => {
      // eslint-disable-next-line global-require
      const DeployCommand = require('./deploy.cmd'); // lazy load the handler to speed up execution time

      yargs
        .option('auto', {
          describe: 'Enable auto-deployment',
          type: 'boolean',
          default: true,
          demandOption: true,
        })
        .option('wsk-auth', {
          describe: 'Adobe I/O Runtime Authentication key',
          type: 'string',
        })
        .option('wsk-namespace', {
          describe: 'Adobe I/O Runtime Namespace',
          type: 'string',
          demandOption: true,
        })
        .option('wsk-host', {
          describe: 'Adobe I/O Runtime API Host',
          type: 'string',
          default: 'runtime.adobe.io',
        })
        .option('loggly-host', {
          describe: 'API Host for Log Appender',
          type: 'string',
          default: 'trieloff.loggly.com',
        })
        .option('loggly-auth', {
          describe: 'API Key for Log Appender ($HLX_LOGGLY_AUTH)',
          type: 'string',
          default: '',
        })
        .option('fastly-namespace', {
          describe: 'CDN Namespace (e.g. Fastly Service ID)',
          type: 'string',
        })
        .option('fastly-auth', {
          describe: 'API Key for Fastly API ($HLX_FASTLY_AUTH)',
          type: 'string',
          default: '',
        })
        .option('target', {
          alias: 'o',
          default: '.hlx/build',
          type: 'string',
          describe: 'Target directory for compiled JS',
        })
        .option('docker', {
          default: 'trieloff/custom-ow-nodejs8:latest',
          describe: 'Docker image for Adobe I/O Runtime function',
        })
        .option('prefix', {
          alias: 'p',
          describe: 'Prefix for the deployed action name.',
          default: `${DeployCommand.getRepository()}--${DeployCommand.getBranchFlag()}--`,
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
        .option('dry-run', {
          describe: 'List the actions that would be created, but do not actually deploy',
          type: 'boolean',
          default: false,
        })
        .option('content', {
          describe: 'Overrides the GitHub content URL',
          type: 'string',
          default: DeployCommand.getDefaultContentURL(),
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
        .demandOption(
          'wsk-auth',
          'Authentication is required. You can pass the key via the HLX_WSK_AUTH environment variable, too',
        )
        .group(['auto', 'wsk-auth', 'wsk-namespace', 'default', 'dirty'], 'Deployment Options')
        .group(['wsk-host', 'loggly-host', 'loggly-auth', 'target', 'docker', 'prefix', 'content'], 'Advanced Options')
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const DeployCommand = require('./deploy.cmd'); // lazy load the handler to speed up execution time
        executor = new DeployCommand();
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
        .withDocker(argv.docker)
        .withPrefix(argv.prefix)
        .withDefault(argv.default)
        .withDryRun(argv.dryRun)
        .withContent(argv.content)
        .run();
    },

  };
};
