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

export default function mergeCmd() {
  let executor;
  return {
    set executor(value) {
      executor = value;
    },
    command: 'merge [path]',
    description: 'Merge remote content into local files',
    builder: (yargs) => {
      yargs
        .positional('path', {
          describe: 'File to merge (e.g. /blog/post.html). Merges all modified files if omitted.',
          type: 'string',
        })
        .option('token', {
          describe: 'IMS Bearer token for da.live authentication',
          type: 'string',
        })
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        const MergeCommand = (await import('./merge.cmd.js')).default;
        executor = new MergeCommand(getOrCreateLogger(argv));
      }
      await executor
        .withToken(argv.token)
        .withFilePath(argv.path)
        .run();
    },
  };
}
