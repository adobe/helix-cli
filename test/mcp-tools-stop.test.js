/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */

import assert from 'assert';
import esmock from 'esmock';

// Mock server implementation
class MockServer {
  constructor(port) {
    this.port = port;
    this.stopped = false;
  }

  async doStop() {
    if (this.failOnStop) {
      throw new Error('Intentional stop failure');
    }
    this.stopped = true;
    return true;
  }

  setFailOnStop() {
    this.failOnStop = true;
  }
}

describe('AEM MCP Tools - stop', () => {
  let logMessages;
  let stopTool;
  let registerServer;
  let mockLogger;

  // Set up mocks before each test
  beforeEach(async () => {
    logMessages = [];
    mockLogger = {
      info: (msg) => { logMessages.push(['info', msg]); },
      error: (msg) => { logMessages.push(['error', msg]); },
    };

    // Mock the log-common module
    const mockLogCommon = {
      getOrCreateLogger: () => mockLogger,
    };

    // Use esmock to mock the dependencies
    const stopModule = await esmock('../src/tools/stop.js', {
      '../src/log-common.js': mockLogCommon,
    });

    // Get the exports from the mocked module
    stopTool = stopModule.default;
    registerServer = stopModule.registerServer;

    // Clean up between tests
    if (stopTool) {
      await stopTool.execute({ all: true }).catch(() => { });
    }
  });

  it('has the right name and description', () => {
    assert.strictEqual(stopTool.name, 'stop');
    assert.ok(stopTool.description);
  });

  it('has an input schema with port and all properties', () => {
    assert.ok(stopTool.inputSchema);
    assert.strictEqual(stopTool.inputSchema.type, 'object');
    assert.ok(stopTool.inputSchema.properties.port);
    assert.ok(stopTool.inputSchema.properties.all);

    assert.strictEqual(stopTool.inputSchema.properties.port.default, 3000);
    assert.strictEqual(stopTool.inputSchema.properties.all.default, true);
  });

  it('registers a server', async () => {
    const mockServer = new MockServer(4000);
    registerServer(4000, mockServer);

    const result = await stopTool.execute({ port: 4000, all: false });

    assert.strictEqual(result.isError, false);
    assert.strictEqual(result.content[0].text, 'AEM development server on port 4000 stopped.');
    assert.strictEqual(mockServer.stopped, true);
  });

  it('returns message when no servers are running', async () => {
    const result = await stopTool.execute({ all: true });

    assert.strictEqual(result.isError, false);
    assert.strictEqual(result.content[0].text, 'No running AEM servers found.');
  });

  it('returns message when specified server is not found', async () => {
    const result = await stopTool.execute({ port: 9999, all: false });

    assert.strictEqual(result.isError, false);
    assert.strictEqual(result.content[0].text, 'No AEM server running on port 9999.');
  });

  it('stops multiple servers when all is true', async () => {
    const mockServer1 = new MockServer(3000);
    const mockServer2 = new MockServer(4000);

    registerServer(3000, mockServer1);
    registerServer(4000, mockServer2);

    const result = await stopTool.execute({ all: true });

    assert.strictEqual(result.isError, false);
    assert.strictEqual(result.content[0].text, 'Stopped 2 AEM server(s).');
    assert.strictEqual(mockServer1.stopped, true);
    assert.strictEqual(mockServer2.stopped, true);
  });

  it('uses port default if not provided', async () => {
    const mockServer = new MockServer(3000);
    registerServer(3000, mockServer);

    const result = await stopTool.execute({ all: false });

    assert.strictEqual(result.isError, false);
    assert.strictEqual(result.content[0].text, 'AEM development server on port 3000 stopped.');
    assert.strictEqual(mockServer.stopped, true);
  });

  it('handles errors when stopping a server', async () => {
    const mockServer = new MockServer(5000);
    mockServer.setFailOnStop();
    registerServer(5000, mockServer);

    const result = await stopTool.execute({ port: 5000, all: false });

    assert.strictEqual(result.isError, true);
    assert.ok(result.content[0].text.includes('Error stopping AEM server'));
  });

  it('logs errors but continues when stopping multiple servers', async () => {
    // Clear log messages to ensure we only capture relevant ones
    logMessages = [];

    const mockServer1 = new MockServer(3000);
    const mockServer2 = new MockServer(4000);
    mockServer2.setFailOnStop();
    const mockServer3 = new MockServer(5000);

    registerServer(3000, mockServer1);
    registerServer(4000, mockServer2);
    registerServer(5000, mockServer3);

    const result = await stopTool.execute({ all: true });

    assert.strictEqual(result.isError, false);
    assert.strictEqual(result.content[0].text, 'Stopped 2 AEM server(s).');
    assert.strictEqual(mockServer1.stopped, true);
    assert.strictEqual(mockServer3.stopped, true);

    // Verify an error was logged
    assert.ok(logMessages.length > 0, 'Expected log messages');
    assert.ok(
      logMessages.some(([level]) => level === 'error'),
      'Expected at least one error log message',
    );
  });

  it('handles string port values correctly', async () => {
    const mockServer = new MockServer(6000);
    registerServer('6000', mockServer);

    const result = await stopTool.execute({ port: 6000, all: false });

    assert.strictEqual(result.isError, false);
    assert.strictEqual(result.content[0].text, 'AEM development server on port 6000 stopped.');
    assert.strictEqual(mockServer.stopped, true);
  });

  // Additional tests to improve coverage
  it('properly handles server being null or undefined', async () => {
    // Forcibly add a null server to test error handling
    registerServer('7000', null);

    const result = await stopTool.execute({ all: true });

    // Should not fail and should return message about stopping 0 servers
    assert.strictEqual(result.isError, false);
    assert.strictEqual(result.content[0].text, 'Stopped 0 AEM server(s).');
  });

  it('handles outer try-catch block by simulating a complete failure', async () => {
    // Create a server with a doStop method that throws in an unexpected way
    const badMockServer = new MockServer(8000);

    // Override the doStop method to throw unexpectedly
    badMockServer.doStop = async () => {
      throw new Error('Catastrophic failure');
    };

    registerServer(8000, badMockServer);

    const result = await stopTool.execute({ port: 8000, all: false });

    assert.strictEqual(result.isError, true);
    assert.strictEqual(result.content[0].text, 'Error stopping AEM server: Catastrophic failure');
  });

  it('handles when runningServers map has entries but all fail to stop', async () => {
    // Clear log messages
    logMessages = [];

    const failServer1 = new MockServer(9001);
    const failServer2 = new MockServer(9002);

    failServer1.setFailOnStop();
    failServer2.setFailOnStop();

    registerServer('9001', failServer1);
    registerServer('9002', failServer2);

    const result = await stopTool.execute({ all: true });

    // Should not be an error even though all servers failed to stop
    assert.strictEqual(result.isError, false);
    assert.strictEqual(result.content[0].text, 'Stopped 0 AEM server(s).');

    // Check for error logs
    assert.ok(logMessages.length > 0, 'Expected log messages');
    assert.ok(
      logMessages.some(([level]) => level === 'error'),
      'Expected at least one error log message',
    );
  });

  it('handles case where runningServers has a port but server is undefined', async () => {
    // Register a server but then make it undefined
    registerServer(9003, undefined);

    const result = await stopTool.execute({ port: 9003, all: false });

    // Should report no server running even though port exists in map
    assert.strictEqual(result.isError, false);
    assert.strictEqual(result.content[0].text, 'No AEM server running on port 9003.');
  });

  it('properly deletes servers from the map after stopping them', async () => {
    const mockServer = new MockServer(9004);
    registerServer(9004, mockServer);

    await stopTool.execute({ port: 9004, all: false });

    // Try to stop the same server again - should report not found
    const secondResult = await stopTool.execute({ port: 9004, all: false });
    assert.strictEqual(secondResult.content[0].text, 'No AEM server running on port 9004.');
  });
});
