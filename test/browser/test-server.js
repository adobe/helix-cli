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

import path from 'path';
import { fileURLToPath } from 'url';
import { HelixProject } from '../../src/server/HelixProject.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test server instance
let testServer = null;

/**
 * Command handler for web-test-runner server commands
 */
export async function testServerCommand(command, payload) {
  switch (command) {
    case 'start-test-server': {
      if (testServer) {
        await testServer.stop();
      }

      // Create test project directory
      const testProjectDir = path.join(__dirname, '../fixtures/test-browser-project');

      // Create a test logger that captures logs
      const logs = [];
      const testLogger = {
        debug: (...args) => logs.push({ level: 'debug', args }),
        info: (...args) => logs.push({ level: 'info', args }),
        warn: (...args) => logs.push({ level: 'warn', args }),
        error: (...args) => logs.push({ level: 'error', args }),
        log: (...args) => logs.push({ level: 'log', args }),
      };

      // Create and start test server
      const project = new HelixProject()
        .withCwd(testProjectDir)
        .withHttpPort(0) // Random port
        .withLiveReload(true)
        .withForwardBrowserLogs(payload.forwardBrowserLogs || false)
        .withLogger(testLogger);

      await project.init();
      await project.start();

      testServer = project;

      return {
        server: project,
        port: project.server.port,
        logs,
      };
    }

    case 'stop-test-server': {
      if (testServer) {
        await testServer.stop();
        testServer = null;
      }
      return { success: true };
    }

    case 'get-server-logs': {
      if (!testServer) {
        throw new Error('No test server running');
      }
      return { logs: testServer._logger.logs || [] };
    }

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

// Clean up on exit
process.on('exit', async () => {
  if (testServer) {
    await testServer.stop();
  }
});
