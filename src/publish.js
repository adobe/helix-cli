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
const yargsGithub = require('./yargs-github.js');
const { makeLogger } = require('./log-common.js');

module.exports = function strain() {
  let executor;

  return {
    set executor(value) {
      executor = value;
    },
    command: ['publish'],
    desc: 'Activate strains in the Fastly CDN and publish the site',
    builder: (yargs) => {
      yargsOpenwhisk(yargs);
      yargsFastly(yargs);
      yargsGithub(yargs);
      yargs
        .option('dry-run', {
          alias: 'dryRun',
          describe: 'List the actions that would be created, but do not actually deploy',
          type: 'boolean',
          default: false,
        })
        .option('remote', {
          describe: 'Use the remote publishing service',
          type: 'boolean',
          default: true,
        })
        .option('api-publish', {
          alias: 'apiPublish',
          describe: 'API URL for helix-publish service',
          type: 'string',
          default: 'https://adobeioruntime.net/api/v1/web/helix/default/publish',
        })
        .option('api-config-purge', {
          alias: 'apiConfigPurge',
          describe: 'API URL for helix bot config service',
          type: 'string',
          default: 'https://app.project-helix.io/config/purge',
        })
        .option('update-bot-config', {
          alias: 'updateBotConfig',
          describe: 'Update the helix bot configuration on the affected content repositories.',
          type: 'boolean',
        })
        .demandOption(
          'fastly-auth',
          'Authentication is required. You can pass the key via the HLX_FASTLY_AUTH environment variable, too',
        )
        .demandOption(
          'fastly-namespace',
          'Fastly Service ID is required',
        )
        .check((args) => {
          if (args.githubToken && args.updateBotConfig === undefined) {
            // eslint-disable-next-line no-param-reassign
            args.updateBotConfig = true;
          } else if (args.updateBotConfig && !args.githubToken) {
            return new Error('Github token is required in order to update bot config.\n'
              + 'Provide one via --github-token or via the HLX_GITHUB_TOKEN environment variable.\n'
              + 'You can use `hlx auth` to automatically obtain a new token.');
          }
          return true;
        })
        .group(['wsk-auth', 'wsk-namespace', 'fastly-auth', 'fastly-namespace'], 'Deployment Options')
        .group(['wsk-host', 'dry-run'], 'Advanced Options')
        .group(['github-token', 'update-bot-config'], 'Helix Bot Options')
        .help();
    },
    handler: async (argv) => {
      if (argv.remote) {
        // eslint-disable-next-line global-require
        const RemotePublish = require('./remotepublish.cmd'); // lazy load the handler to speed up execution time
        executor = executor || new RemotePublish(makeLogger(argv));
      } else {
        // eslint-disable-next-line global-require
        const PublishCommand = require('./publish.cmd'); // lazy load the handler to speed up execution time
        executor = executor || new PublishCommand(makeLogger(argv));
      }

      const cmd = executor
        .withWskAuth(argv.wskAuth)
        .withWskHost(argv.wskHost)
        .withWskNamespace(argv.wskNamespace)
        .withFastlyNamespace(argv.fastlyNamespace)
        .withFastlyAuth(argv.fastlyAuth)
        .withDryRun(argv.dryRun)
        .withPublishAPI(argv.apiPublish);

      if (argv.remote) {
        // only support updating the bot config for remote publish
        cmd
          .withGithubToken(argv.githubToken)
          .withUpdateBotConfig(argv.updateBotConfig)
          .withConfigPurgeAPI(argv.apiConfigPurge);
      }
      await cmd.run();
    },

  };
};
