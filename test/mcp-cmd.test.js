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
/* eslint-env mocha */
import assert from 'assert';
import sinon from 'sinon';
import { EventEmitter } from 'events';
import { createTestLogger } from '@adobe/helix-log';
import esmock from 'esmock';
import MCPCommand from '../src/mcp.cmd.js';

describe('MCP Command', () => {
  let consoleLogStub;

  beforeEach(() => {
    // Stub console.log to capture JSON-RPC responses
    consoleLogStub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    consoleLogStub.restore();
    sinon.restore();
  });

  it('initializes with provided logger', () => {
    const logger = createTestLogger();
    const cmd = new MCPCommand(logger);

    assert.strictEqual(cmd.log, logger);
    // eslint-disable-next-line no-underscore-dangle
    assert.deepStrictEqual(cmd._tools, []);
  });

  it('registers tools via withTools method', () => {
    const logger = createTestLogger();
    const cmd = new MCPCommand(logger);
    const tools = [{ name: 'test-tool' }];

    const result = cmd.withTools(tools);

    // Should return self for chaining
    assert.strictEqual(result, cmd);
    // eslint-disable-next-line no-underscore-dangle
    assert.deepStrictEqual(cmd._tools, tools);
  });

  it('handles falsy tools parameter in withTools method', () => {
    const logger = createTestLogger();
    const cmd = new MCPCommand(logger);

    // Call withTools with null/undefined
    const result = cmd.withTools(null);

    // Should return self for chaining
    assert.strictEqual(result, cmd);
    // eslint-disable-next-line no-underscore-dangle
    assert.deepStrictEqual(cmd._tools, []);
  });

  it('handles initialize request', async () => {
    const logger = createTestLogger();
    const cmd = new MCPCommand(logger);

    // Call the handler directly
    cmd.handleRequest({
      jsonrpc: '2.0',
      method: 'initialize',
      id: 1,
    });

    // Verify response
    sinon.assert.calledOnce(consoleLogStub);
    const response = JSON.parse(consoleLogStub.firstCall.args[0]);
    assert.equal(response.id, 1);
    assert.equal(response.jsonrpc, '2.0');
    assert.equal(response.result.protocolVersion, '2024-11-05');
    assert.equal(response.result.serverInfo.name, 'helix-cli-mcp');
  });

  it('handles notifications/initialized request (no response)', async () => {
    const logger = createTestLogger();
    const cmd = new MCPCommand(logger);

    // Create spy for sendResponse
    const sendResponseSpy = sinon.spy(cmd, 'sendResponse');

    // Call the handler directly with notifications/initialized method
    cmd.handleRequest({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      id: 1.5,
    });

    // Verify no response was sent (since method is a notification)
    sinon.assert.notCalled(sendResponseSpy);
    // Console.log should not be called either
    sinon.assert.notCalled(consoleLogStub);
  });

  it('handles tools/list request', async () => {
    const logger = createTestLogger();
    const tools = [
      { name: 'tool1' },
      { name: 'tool2' },
    ];

    const cmd = new MCPCommand(logger);
    cmd.withTools(tools);

    // Call the handler directly
    cmd.handleRequest({
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 2,
    });

    // Verify response
    sinon.assert.calledOnce(consoleLogStub);
    const response = JSON.parse(consoleLogStub.firstCall.args[0]);
    assert.equal(response.id, 2);
    assert.deepStrictEqual(response.result.tools, tools);
  });

  it('handles prompts/list request', async () => {
    const logger = createTestLogger();
    const cmd = new MCPCommand(logger);

    // Call the handler directly
    cmd.handleRequest({
      jsonrpc: '2.0',
      method: 'prompts/list',
      id: 3,
    });

    // Verify response
    sinon.assert.calledOnce(consoleLogStub);
    const response = JSON.parse(consoleLogStub.firstCall.args[0]);
    assert.equal(response.id, 3);
    assert.deepStrictEqual(response.result.prompts, []);
  });

  it('handles resources/list request', async () => {
    const logger = createTestLogger();
    const cmd = new MCPCommand(logger);

    // Call the handler directly
    cmd.handleRequest({
      jsonrpc: '2.0',
      method: 'resources/list',
      id: 4,
    });

    // Verify response
    sinon.assert.calledOnce(consoleLogStub);
    const response = JSON.parse(consoleLogStub.firstCall.args[0]);
    assert.equal(response.id, 4);
    assert.deepStrictEqual(response.result.resources, []);
  });

  it('handles ping request', async () => {
    const logger = createTestLogger();
    const cmd = new MCPCommand(logger);

    // Call the handler directly
    cmd.handleRequest({
      jsonrpc: '2.0',
      method: 'ping',
      id: 5,
    });

    // Verify response
    sinon.assert.calledOnce(consoleLogStub);
    const response = JSON.parse(consoleLogStub.firstCall.args[0]);
    assert.equal(response.id, 5);
    assert.deepStrictEqual(response.result, {});
  });

  it('returns method not found for unknown methods', async () => {
    const logger = createTestLogger();
    const cmd = new MCPCommand(logger);

    // Call the handler directly with unknown method
    cmd.handleRequest({
      jsonrpc: '2.0',
      method: 'unknown',
      id: 6,
    });

    // Verify error response
    sinon.assert.calledOnce(consoleLogStub);
    const response = JSON.parse(consoleLogStub.firstCall.args[0]);
    assert.equal(response.id, 6);
    assert.equal(response.error.code, -32601);
    assert.equal(response.error.message, 'Method not found');
  });

  it('handles tools/call request for existing tool', async () => {
    const logger = createTestLogger();

    // Create mock tool with execute method
    const mockExecute = sinon.stub().resolves({ success: true });
    const tools = [
      { name: 'test-tool', execute: mockExecute },
    ];

    const cmd = new MCPCommand(logger);
    cmd.withTools(tools);

    // Call the handler directly
    await cmd.handleRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 7,
      params: {
        name: 'test-tool',
        arguments: { key: 'value' },
      },
    });

    // Verify tool execute was called with arguments
    sinon.assert.calledOnce(mockExecute);
    sinon.assert.calledWith(mockExecute, { key: 'value' });

    // Verify response
    sinon.assert.calledOnce(consoleLogStub);
    const response = JSON.parse(consoleLogStub.firstCall.args[0]);
    assert.equal(response.id, 7);
    assert.deepStrictEqual(response.result, { success: true });
  });

  it('handles tools/call request for non-existent tool', async () => {
    const logger = createTestLogger();
    const cmd = new MCPCommand(logger);

    // Call the handler directly with non-existent tool
    await cmd.handleRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 8,
      params: {
        name: 'non-existent-tool',
        arguments: {},
      },
    });

    // Verify error response
    sinon.assert.calledOnce(consoleLogStub);
    const response = JSON.parse(consoleLogStub.firstCall.args[0]);
    assert.equal(response.id, 8);
    assert.equal(response.error.code, -32601);
    assert.equal(response.error.message, "Tool 'non-existent-tool' not found");
  });

  it('handles tools/call for tool without execute method', async () => {
    const logger = createTestLogger();
    const tools = [
      { name: 'invalid-tool' }, // No execute method
    ];

    const cmd = new MCPCommand(logger);
    cmd.withTools(tools);

    // Call the handler directly
    await cmd.handleRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 9,
      params: {
        name: 'invalid-tool',
        arguments: {},
      },
    });

    // Verify error response
    sinon.assert.calledOnce(consoleLogStub);
    const response = JSON.parse(consoleLogStub.firstCall.args[0]);
    assert.equal(response.id, 9);
    assert.equal(response.error.code, -32603);
    assert.equal(response.error.message, "Tool 'invalid-tool' does not have an execute function");
  });

  it('handles tools/call error during execution', async () => {
    const logger = createTestLogger();

    // Create mock tool that throws error
    const mockExecute = sinon.stub().rejects(new Error('test error'));
    const tools = [
      { name: 'error-tool', execute: mockExecute },
    ];

    const cmd = new MCPCommand(logger);
    cmd.withTools(tools);

    // Call the handler directly
    await cmd.handleRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 10,
      params: {
        name: 'error-tool',
        arguments: {},
      },
    });

    // Verify error response
    sinon.assert.calledOnce(consoleLogStub);
    const response = JSON.parse(consoleLogStub.firstCall.args[0]);
    assert.equal(response.id, 10);
    assert.equal(response.error.code, -32603);
    assert.equal(response.error.message, 'Error executing tool: test error');
  });

  it('handles invalid JSON in the run method', async () => {
    const logger = createTestLogger();
    const loggerErrorSpy = sinon.spy(logger, 'error');

    // Mock readline interface
    const lineEmitter = new EventEmitter();
    const createInterfaceStub = sinon.stub().returns(lineEmitter);

    // Replace readline with our mock
    const MockedCommand = await esmock('../src/mcp.cmd.js', {
      readline: {
        createInterface: createInterfaceStub,
      },
    });

    // Create command instance with a spy for sendErrorResponse
    const mockedCmd = new MockedCommand(logger);
    const sendErrorResponseSpy = sinon.spy(mockedCmd, 'sendErrorResponse');

    // Start the command
    await mockedCmd.run();

    // Emit invalid JSON to trigger error handling
    lineEmitter.emit('line', '{invalid:json}');

    // Check that error was logged
    sinon.assert.called(loggerErrorSpy);
    sinon.assert.calledWithMatch(loggerErrorSpy, /Error processing request/);

    // Verify sendErrorResponse was called with correct error code
    sinon.assert.called(sendErrorResponseSpy);
    sinon.assert.calledWith(sendErrorResponseSpy, -32700, 'Parse error', null);
  });
});
