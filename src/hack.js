/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { getOrCreateLogger } from './log-common.js';

export default function hack() {
  let executor;
  return {
    set executor(value) {
      executor = value;
    },
    command: 'hack [hackathon]',
    aliases: [],
    builder: (yargs) => {
      yargs
        .option('open', {
          describe: 'Open a browser window',
          type: 'boolean',
          default: true,
        })
        .positional('hackathon', {
          describe: 'The hackathon to attend',
          default: '',
          array: false,
          type: 'string',
        })
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const HackCommand = (await import('./hack.cmd.js')).default; // lazy load the handler to speed up execution time
        executor = new HackCommand(getOrCreateLogger(argv));
        executor.withHackathon(argv.hackathon);
        executor.withOpen(argv.open);
      }

      await executor
        .run();
    },
  };
}
