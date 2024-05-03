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
import path from 'path';
import { getOrCreateLogger } from './log-common.js';

export default function up() {
  let executor;
  return {
    set executor(value) {
      executor = value;
    },
    command: 'up',
    description: 'Run a AEM development server',
    builder: (yargs) => {
      yargs
        .option('open', {
          describe: 'Open a browser window at specified path',
          type: 'string',
          default: '/',
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
        .option('port', {
          describe: 'Start development server on port',
          type: 'int',
          default: 3000,
        })
        .option('addr', {
          describe: 'Bind development server on addr. use * to bind to any address and allow external connections.',
          type: 'string',
          default: '127.0.0.1',
        })
        .option('tls-cert', {
          alias: 'tlsCert',
          describe: 'File location for your .pem file for local TLS support',
          type: 'string',
          default: undefined,
        })
        .option('tls-key', {
          alias: 'tlsKey',
          describe: 'File location for your .key file for local TLS support',
          type: 'string',
          default: undefined,
        })
        .option('stop-other', {
          alias: 'stopOther',
          describe: 'Stop other AEM CLI running on the above port',
          type: 'boolean',
          default: true,
        })
        .option('print-index', {
          alias: 'printIndex',
          describe: 'Prints the indexed records for the current page.',
          type: 'boolean',
          default: false,
        })
        .group(['port', 'addr', 'stop-other', 'tls-cert', 'tls-key'], 'Server options')
        .option('url', {
          alias: ['pagesUrl', 'pages-url'],
          describe: 'The origin url to fetch content from.',
          type: 'string',
        })
        .option('alpha-cache', {
          alias: 'alphaCache',
          describe: 'Path to local folder to cache the responses (note: this is an alpha feature, it may be removed without notice)',
          type: 'string',
        })
        .group(['url', 'livereload', 'no-livereload', 'open', 'no-open', 'print-index', 'cache'], 'AEM Options')
        .option('allow-insecure', {
          alias: 'allowInsecure',
          describe: 'Whether to allow insecure requests to the server',
          type: 'boolean',
          default: false,
        })

        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const UpCommand = (await import('./up.cmd.js')).default; // lazy load the handler to speed up execution time
        executor = new UpCommand(getOrCreateLogger(argv));
      }

      await executor
        .withHttpPort(argv.port)
        .withBindAddr(argv.addr)
        // only open  browser window when executable is `aem`
        // this prevents the window to be opened during integration tests
        .withOpen(path.basename(argv.$0) === 'aem' ? argv.open : false)
        .withTLS(argv.tlsKey, argv.tlsCert)
        .withLiveReload(argv.livereload)
        .withUrl(argv.url)
        .withPrintIndex(argv.printIndex)
        .withAllowInsecure(argv.allowInsecure)
        .withKill(argv.stopOther)
        .withCache(argv.alphaCache)
        .run();
    },
  };
}
