/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { getOrCreateLogger } from '../log-common.js';
import { normalizeDaPath, LARGE_CLONE_FILE_THRESHOLD } from './content-shared.js';

export default function clone() {
  let executor;
  return {
    set executor(value) {
      executor = value;
    },
    command: 'clone',
    description: 'Clone da.live content locally into content/',
    builder: (yargs) => {
      yargs
        .option('path', {
          describe: 'da.live folder to clone (e.g. /ca/fr_ca). Omit only when using --all.',
          type: 'string',
        })
        .option('all', {
          describe: 'Clone the entire site content (large). Use instead of --path.',
          type: 'boolean',
          default: false,
        })
        .option('token', {
          describe: 'IMS Bearer token for da.live authentication',
          type: 'string',
        })
        .option('force', {
          describe: 'Overwrite existing content/ without prompting',
          type: 'boolean',
          default: false,
        })
        .option('yes', {
          alias: 'y',
          describe: `Proceed without prompting when the clone has more than ${LARGE_CLONE_FILE_THRESHOLD.toLocaleString()} files`,
          type: 'boolean',
          default: false,
        })
        .check((argv) => {
          if (argv.all && argv.path !== undefined && argv.path !== '') {
            return 'Do not use --path together with --all.';
          }
          if (!argv.all && (argv.path === undefined || argv.path === '')) {
            return 'Missing --path. Example: aem content clone --path /ca/fr_ca. Use --all to clone all the content.';
          }
          return true;
        })
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        const CloneCommand = (await import('./clone.cmd.js')).default;
        executor = new CloneCommand(getOrCreateLogger(argv));
      }
      const rootPath = argv.all ? '/' : normalizeDaPath(argv.path);
      await executor
        .withToken(argv.token)
        .withForce(argv.force)
        .withAssumeYes(argv.yes)
        .withRootPath(rootPath)
        .run();
    },
  };
}
