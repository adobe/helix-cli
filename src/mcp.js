/*
 * Copyright 2025 Adobe. All rights reserved.
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
import upTool from './tools/up.js';
import stopTool from './tools/stop.js';
import logsTool from './tools/logs.js';

export default function mcp() {
  let executor;
  return {
    command: 'mcp',
    aliases: [],
    builder: (yargs) => {
      yargs
        .help();
    },
    handler: async (argv) => {
      if (!executor) {
        const MCPCommand = (await import('./mcp.cmd.js')).default;
        executor = new MCPCommand(getOrCreateLogger(argv));
        executor.withTools([upTool, stopTool, logsTool]);
      }

      await executor
        .run();
    },
  };
}
