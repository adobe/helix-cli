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
const yargsBuild = require('./yargs-build.js');
const yargsParams = require('./yargs-params.js');
const yargsCoralogix = require('./yargs-coralogix.js');
const yargsEpsagon = require('./yargs-epsagon.js');
const { getOrCreateLogger } = require('./log-common.js');

module.exports = function deploy() {
  let executor;

  return {
    set executor(value) {
      executor = value;
    },
    command: 'deploy [files..]',
    desc: 'Deploy packaged functions to Adobe I/O runtime',
    builder: (yargs) => {
      yargsOpenwhisk(yargs);
      yargsFastly(yargs);
      yargsBuild(yargs);
      yargsEpsagon(yargs);
      yargsCoralogix(yargs);
      yargsParams(yargs, {
        name: 'default',
        describe: 'Adds a default parameter to the function',
        type: 'array',
        default: [],
      });
      yargs
        .option('dry-run', {
          alias: 'dryRun',
          describe: 'List the actions that would be created, but do not actually deploy',
          type: 'boolean',
          default: false,
        })
        .option('target', {
          alias: 'o',
          default: '.hlx/build',
          type: 'string',
          describe: 'Target directory of created action packages.',
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
        .option('updated-at', {
          alias: 'updatedAt',
          describe: 'Informative Unix timestamp for the deployed actions.',
          type: 'string',
          default: new Date().getTime(),
        })
        .option('updated-by', {
          alias: 'updatedBy',
          describe: 'Informative user name for the deployed actions.',
          type: 'string',
        })
        .group(['wsk-auth', 'wsk-namespace', 'default', 'default-file', 'dirty'], 'Deployment Options')
        .group(['wsk-host', 'target', 'epsagon-app-name', 'epsagon-token', 'coralogix-app-name', 'coralogix-token'], 'Advanced Options')
        .group(['package', 'minify', 'target'], 'Package options')
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const DeployCommand = require('./deploy.cmd'); // lazy load the handler to speed up execution time
        executor = new DeployCommand(getOrCreateLogger(argv));
      }

      await executor
        .withEnableDirty(argv.dirty)
        .withWskAuth(argv.wskAuth)
        .withWskHost(argv.wskHost)
        .withWskNamespace(argv.wskNamespace)
        .withWskActionMemory(argv.wskActionMemory)
        .withWskActionConcurrency(argv.wskActionConcurrency)
        .withTarget(argv.target)
        .withFiles(argv.files)
        .withDefault(argv.default)
        .withDefaultFile(argv.defaultFile)
        .withDryRun(argv.dryRun)
        .withCreatePackages(argv.package)
        .withAddStrain(argv.add)
        .withMinify(argv.minify)
        .withResolveGitRefService(argv.svcResolveGitRef)
        .withCustomPipeline(argv.customPipeline)
        .withEpsagonAppName(argv.epsagonAppName)
        .withEpsagonToken(argv.epsagonToken)
        .withCoralogixAppName(argv.coralogixAppName)
        .withCoralogixToken(argv.coralogixToken)
        .withUpdatedAt(argv.updatedAt)
        .withUpdatedBy(argv.updatedBy)
        .run();
    },

  };
};
