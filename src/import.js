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
    command: 'import',
    description: 'Run the AEM import server',
    builder: (yargs) => {
      yargs
        .option('open', {
          describe: 'Open a browser window at specified path',
          type: 'string',
          default: '/tools/importer/helix-importer-ui/index.html',
        })
        .option('ui-repo', {
          alias: 'uiRepo',
          describe: 'Git repository for the AEM Importer UI',
          type: 'string',
          default: 'https://github.com/adobe/helix-importer-ui',
        })
        .option('skip-ui', {
          alias: 'skipUI',
          describe: 'Do not install the AEM Importer UI',
          type: 'boolean',
          default: false,
        })
        .option('no-open', {
          // negation of the open option (resets open default)
          // see https://github.com/yargs/yargs/blob/master/docs/tricks.md#negating-boolean-arguments
          alias: 'noOpen',
          describe: 'Disable automatic opening of browser window',
          type: 'boolean',
        })
        .option('port', {
          describe: 'Start import server on port',
          type: 'int',
          default: 3001,
        })
        .option('addr', {
          describe: 'Bind import server on addr. use * to bind to any address and allow external connections.',
          type: 'string',
          default: '127.0.0.1',
        })
        .option('stop-other', {
          alias: 'stopOther',
          describe: 'Stop other AEM CLI running on the above port',
          type: 'boolean',
          default: true,
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
        .option('headers-file', {
          alias: 'headersFile',
          describe: 'Location of a custom .json file containing headers to be used with all proxy requests',
          type: 'string',
          default: undefined,
        })
        .group(['port', 'addr', 'stop-other', 'tls-cert', 'tls-key'], 'Server options')
        .option('cache', {
          describe: 'Path to local folder to cache the responses',
          type: 'string',
        })
        .group(['open', 'no-open', 'cache', 'ui-repo', 'skip-ui', 'headers-file'], 'AEM Importer Options')
        .option('allow-insecure', {
          alias: 'allowInsecure',
          describe: 'Whether to allow insecure requests to the server',
          type: 'boolean',
          default: true,
        })

        .help();
    },
    handler: async (argv) => {
      // codecov:ignore:start
      /* c8 ignore start */
      if (!executor) {
        // eslint-disable-next-line global-require
        const ImportCommand = (await import('./import.cmd.js')).default; // lazy load the handler to speed up execution time
        executor = new ImportCommand(getOrCreateLogger(argv));
      }
      // codecov:ignore:end
      /* c8 ignore end */
      await executor
        .withHttpPort(argv.port)
        .withBindAddr(argv.addr)
        // only open  browser window when executable is `aem`
        // this prevents the window to be opened during integration tests
        .withOpen(path.basename(argv.$0) === 'aem' ? argv.open : false)
        .withTLS(argv.tlsKey, argv.tlsCert)
        .withAllowInsecure(argv.allowInsecure)
        .withKill(argv.stopOther)
        .withCache(argv.cache)
        .withSkipUI(argv.skipUI)
        .withUIRepo(argv.uiRepo)
        .withHeadersFile(argv.headersFile)
        .run();
    },
  };
}
