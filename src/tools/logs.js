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
import { getLogs } from '../mcp-logger.js';

/**
 * Tool to retrieve log entries from the in-memory logger
 */
const logsTool = {
  name: 'logs',
  description: 'Retrieve the last log entries from the MCP server.\n\nArgs:\n lines, filter',
  inputSchema: {
    properties: {
      lines: {
        title: 'Lines',
        type: 'integer',
        default: 20,
        description: 'Number of log lines to retrieve',
      },
      seconds: {
        title: 'Seconds',
        type: 'integer',
        description: 'Number of seconds to retrieve logs for',
      },
      filter: {
        title: 'Filter',
        type: 'string',
        description: 'Optional text to filter log lines (case-insensitive)',
      },
      levels: {
        title: 'Levels',
        type: 'array',
        default: ['info', 'warn', 'error'],
        items: {
          enum: ['trace', 'silly', 'debug', 'info', 'warn', 'error'],
        },
        description: 'Optional array of log levels to filter',
      },
    },
    type: 'object',
  },
  execute: async (args) => {
    try {
      const lines = args.lines || 20;
      const filter = args.filter || '';
      const seconds = args.seconds || null;
      const levels = args.levels || null;

      // Get structured logs from in-memory buffer
      // If seconds is specified, it takes precedence over lines
      const logEntries = getLogs(lines, filter, seconds, levels);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(logEntries, null, 2) || 'No log entries found.',
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error retrieving logs: ${error.message}`,
        }],
        isError: true,
      };
    }
  },
};

export default logsTool;
