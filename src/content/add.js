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

export default function add() {
  let executor;
  return {
    set executor(value) {
      executor = value;
    },
    command: 'add [files..]',
    description: 'Stage changes in content/ (like git add)',
    builder: (yargs) => {
      yargs
        .positional('files', {
          describe:
            'Paths under content/ to stage, or the same with a content/ prefix for tab completion (default: all)',
          type: 'string',
          array: true,
        })
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        const AddCommand = (await import('./add.cmd.js')).default;
        executor = new AddCommand(getOrCreateLogger(argv));
      }
      const { files } = argv;
      let paths = [];
      if (Array.isArray(files)) {
        paths = files;
      } else if (files) {
        paths = [files];
      }
      await executor.withPaths(paths).run();
    },
  };
}
