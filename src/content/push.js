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

export default function push() {
  let executor;
  return {
    set executor(value) {
      executor = value;
    },
    command: 'push',
    description: 'Push committed content/ changes to da.live (use content add & content commit first)',
    builder: (yargs) => {
      yargs
        .option('token', {
          describe: 'IMS Bearer token for da.live authentication',
          type: 'string',
        })
        .option('path', {
          describe: 'Push only a specific file or subtree (e.g. /blog)',
          type: 'string',
        })
        .option('force', {
          describe: 'Overwrite remote changes even when conflicts are detected',
          type: 'boolean',
          default: false,
        })
        .option('dry-run', {
          alias: 'dryRun',
          describe: 'Show what would be pushed without actually pushing',
          type: 'boolean',
          default: false,
        })
        .option('preview', {
          describe: 'After a successful push, start a bulk preview job on admin.hlx.page for changed paths',
          type: 'boolean',
          default: false,
        })
        .option('publish', {
          describe:
            'After a successful push, bulk preview then bulk publish on admin.hlx.page (publish waits for preview)',
          type: 'boolean',
          default: false,
        })
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        const PushCommand = (await import('./push.cmd.js')).default;
        executor = new PushCommand(getOrCreateLogger(argv));
      }
      await executor
        .withToken(argv.token)
        .withPath(argv.path)
        .withForce(argv.force)
        .withDryRun(argv.dryRun)
        .withPreview(argv.preview)
        .withPublish(argv.publish)
        .run();
    },
  };
}
