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
const yargsGithub = require('./yargs-github.js');
const yargsAlgolia = require('./yargs-algolia.js');
const { getOrCreateLogger } = require('./log-common.js');

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
      yargsGithub(yargs);
      yargsAlgolia(yargs);
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
        .option('livereload', {
          describe: 'Enable automatic reloading of modified sources in browser.',
          type: 'boolean',
          default: true,
        })
        .option('no-livereload', {
          // negation of the livereload option (resets open default)
          // see https://github.com/yargs/yargs/blob/master/docs/tricks.md#negating-boolean-arguments
          alias: 'noLiveReload',
          describe: 'Disable live-reload',
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
          default: '.',
        })
        // allow for comma separated values
        .coerce('localRepo', (value) => value.reduce((acc, curr) => {
          if (curr) {
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
        .option('pages-proxy', {
          alias: 'pagesProxy',
          describe: 'Use the pages proxy',
          type: 'boolean',
          default: true,
        })
        .option('pages-url', {
          alias: 'pagesUrl',
          describe: 'The origin url to fetch pages content from.',
          type: 'string',
        })
        .option('pages-cache', {
          alias: 'pagesCache',
          describe: 'Enable memory cache for pages content.',
          type: 'boolean',
          default: true,
        })
        .group(['pages-proxy', 'pages-url', 'pages-cache'], 'Helix Pages Options')

        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const UpCommand = require('./up.cmd'); // lazy load the handler to speed up execution time
        executor = new UpCommand(getOrCreateLogger(argv));
      }

      await executor
        .withTargetDir(argv.target)
        .withFiles(argv.files)
        .withOverrideHost(argv.host)
        .withSaveConfig(argv.saveConfig)
        .withHttpPort(argv.port)
        .withLocalRepo(argv.localRepo)
        .withDevDefault(argv.devDefault)
        .withDevDefaultFile(argv.devDefaultFile)
        .withGithubToken(argv.githubToken)
        // only open  browser window when executable is `hlx`
        // this prevents the window to be opened during integration tests
        .withOpen(argv.open && path.basename(argv.$0) === 'hlx')
        .withLiveReload(argv.livereload)
        .withCustomPipeline(argv.customPipeline)
        .withAlgoliaAppID(argv.algoliaAppID)
        .withAlgoliaAPIKey(argv.algoliaAPIKey)
        .withPagesProxy(argv.pagesProxy)
        .withPagesUrl(argv.pagesUrl)
        .withPagesCache(argv.pagesCache)
        .run();
    },
  };
};
