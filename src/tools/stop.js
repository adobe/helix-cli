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
import { getOrCreateLogger } from '../log-common.js';

// Store running server instances so they can be stopped
const runningServers = new Map();

// Register a server for later stopping
export function registerServer(port, serverInstance) {
  runningServers.set(port.toString(), serverInstance);
}

/**
 * Tool to stop running AEM development servers
 */
const stopTool = {
  name: 'stop',
  description: 'Stop a running AEM development server.\n\nArgs:\n port',
  inputSchema: {
    properties: {
      port: {
        title: 'Port',
        type: 'integer',
        default: 3000,
        description: 'Port of the development server to stop',
      },
      all: {
        title: 'All',
        type: 'boolean',
        default: true,
        description: 'Stop all running servers',
      },
    },
    type: 'object',
  },
  execute: async (args) => {
    try {
      const logger = getOrCreateLogger();

      if (args.all) {
        // Stop all servers
        if (runningServers.size === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No running AEM servers found.',
            }],
            isError: false,
          };
        }

        const ports = [...runningServers.keys()];
        let stoppedCount = 0;

        // Use Promise.all to avoid await in a loop
        await Promise.all(ports.map(async (port) => {
          const server = runningServers.get(port);
          if (server) {
            try {
              await server.doStop();
              runningServers.delete(port);
              stoppedCount += 1; // Use += 1 instead of ++
            } catch (err) {
              logger.error(`Error stopping server on port ${port}: ${err.message}`);
            }
          }
        }));

        return {
          content: [{
            type: 'text',
            text: `Stopped ${stoppedCount} AEM server(s).`,
          }],
          isError: false,
        };
      }

      // Stop a specific server
      const port = args.port ? args.port.toString() : '3000';
      const server = runningServers.get(port);

      if (!server) {
        return {
          content: [{
            type: 'text',
            text: `No AEM server running on port ${port}.`,
          }],
          isError: false,
        };
      }

      await server.doStop();
      runningServers.delete(port);

      return {
        content: [{
          type: 'text',
          text: `AEM development server on port ${port} stopped.`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error stopping AEM server: ${error.message}`,
        }],
        isError: true,
      };
    }
  },
};

export default stopTool;
