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
import { createTestLogger } from '@adobe/helix-log';
import esmock from 'esmock';
import mcp from '../src/mcp.js';
import MCPCommand from '../src/mcp.cmd.js';

describe('Test hlx MCP CLI', () => {
  it('hlx mcp command structure', async () => {
    // Test command structure
    const mcpCmd = mcp();
    assert.equal(mcpCmd.command, 'mcp');
    assert.equal(Array.isArray(mcpCmd.aliases), true);
    assert.equal(typeof mcpCmd.builder, 'function');
    assert.equal(typeof mcpCmd.handler, 'function');
  });

  it('mcp command builder configures yargs', async () => {
    const yargs = {
      help: sinon.spy(),
    };

    const mcpCmd = mcp();
    mcpCmd.builder(yargs);

    sinon.assert.calledOnce(yargs.help);
  });

  it('mcp command initialization', async () => {
    // Initialize with logger and verify it's passed to the command
    const logger = createTestLogger();
    const cmd = new MCPCommand(logger);

    assert.strictEqual(cmd.log, logger);
    // eslint-disable-next-line no-underscore-dangle
    assert.equal(Array.isArray(cmd._tools), true);
  });

  it('mcp command allows tools registration', async () => {
    const logger = createTestLogger();
    const cmd = new MCPCommand(logger);

    const mockTools = [{ name: 'mock-tool' }];
    const result = cmd.withTools(mockTools);

    // Should return itself for chaining
    assert.strictEqual(result, cmd);
    // Tools should be stored
    // eslint-disable-next-line no-underscore-dangle
    assert.deepStrictEqual(cmd._tools, mockTools);
  });

  it('handler initializes and runs executor', async () => {
    // Create mock executor and run method
    const runSpy = sinon.spy();
    const mockExecutor = {
      run: runSpy,
      withTools: () => mockExecutor, // Return self for chaining
    };

    // Spy on the withTools method
    const withToolsSpy = sinon.spy(mockExecutor, 'withTools');

    // Create a stub MCPCommand constructor
    const MockCommandStub = sinon.stub().returns(mockExecutor);

    // Create a mocked version of the mcp module
    const mockedMcp = await esmock.p('../src/mcp.js', import.meta.url, {
      // eslint-disable-next-line no-extra-parens
      '../src/mcp.cmd.js': { default: MockCommandStub },
    });

    const mcpHandler = mockedMcp().handler;

    // Execute the handler
    await mcpHandler({ logLevel: 'info' });

    // Verify executor was created and run was called
    sinon.assert.calledOnce(MockCommandStub);
    sinon.assert.calledOnce(withToolsSpy);
    sinon.assert.calledOnce(runSpy);

    // Reset the spies
    MockCommandStub.resetHistory();
    withToolsSpy.resetHistory();
    runSpy.resetHistory();

    // Execute again
    await mcpHandler({ logLevel: 'debug' });

    // Verify executor was not created again
    sinon.assert.notCalled(MockCommandStub);
    sinon.assert.notCalled(withToolsSpy);

    // But run was called again
    sinon.assert.calledOnce(runSpy);
  });
});
