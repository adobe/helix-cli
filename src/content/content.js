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
import clone from './clone.js';
import add from './add.js';
import commit from './commit.js';
import push from './push.js';
import status from './status.js';
import diff from './diff.js';
import mergeCmd from './merge.js';

export default function content() {
  return {
    command: 'content',
    description: 'Manage AEM content from da.live',
    builder: (yargs) => {
      yargs
        .command(clone())
        .command(add())
        .command(commit())
        .command(push())
        .command(status())
        .command(diff())
        .command(mergeCmd())
        .demandCommand(1, 'You need at least one content subcommand.')
        .help();
    },
    handler: () => {},
  };
}
