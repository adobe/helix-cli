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

export default function clone() {
  let executor;
  return {
    set executor(value) {
      executor = value;
    },
    command: 'clone',
    description: 'Clone da.live content locally into aem-content/',
    builder: (yargs) => {
      yargs
        .option('token', {
          describe: 'IMS Bearer token for da.live authentication',
          type: 'string',
        })
        .option('force', {
          describe: 'Overwrite existing aem-content/ without prompting',
          type: 'boolean',
          default: false,
        })
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        const CloneCommand = (await import('./clone.cmd.js')).default;
        executor = new CloneCommand(getOrCreateLogger(argv));
      }
      await executor
        .withToken(argv.token)
        .withForce(argv.force)
        .run();
    },
  };
}
