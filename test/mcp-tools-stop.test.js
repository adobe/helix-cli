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
import esmock from 'esmock';

describe('MCP Tools - stop', () => {
  // Stubs for dependencies
  let mockLoggerInstance;
  let createLoggerStub;
  let stopTool;

  beforeEach(async () => {
    // Create mock logger with error method
    mockLoggerInstance = {
      error: sinon.stub(),
      info: sinon.stub(),
      debug: sinon.stub(),
      warn: sinon.stub(),
    };

    // Create stub for createInMemoryLogger
    createLoggerStub = sinon.stub().returns(mockLoggerInstance);

    // Mock the dependencies
    const stopModule = await esmock.p('../src/tools/stop.js', {
      '../src/log-common.js': { getOrCreateLogger: createLoggerStub },
    });

    // Get a reference to the tool
    stopTool = stopModule.default;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('has the correct name and description', () => {
    assert.strictEqual(stopTool.name, 'stop');
    assert.ok(stopTool.description.includes('Stop a running AEM development server'));
  });

  it('has the expected input schema', () => {
    const schema = stopTool.inputSchema;
    assert.strictEqual(schema.type, 'object');

    // Check presence of expected properties
    const expectedProps = ['port', 'all'];
    expectedProps.forEach((prop) => {
      assert.ok(schema.properties[prop], `Schema should include ${prop} property`);
    });

    // Check defaults for some properties
    assert.strictEqual(schema.properties.port.default, 3000);
    assert.strictEqual(schema.properties.all.default, true);
  });

  it('handles request to stop a specific server', async () => {
    const result = await stopTool.execute({ port: 3000, all: false });

    // Should be successful and have a response
    assert.strictEqual(result.isError, false);
    assert.ok(Array.isArray(result.content));
    assert.ok(result.content.length > 0);
    assert.strictEqual(result.content[0].type, 'text');
  });

  it('handles request to stop all servers', async () => {
    const result = await stopTool.execute({ all: true });

    // Should be successful and have a response
    assert.strictEqual(result.isError, false);
    assert.ok(Array.isArray(result.content));
    assert.ok(result.content.length > 0);
    assert.strictEqual(result.content[0].type, 'text');
  });

  it('creates a logger when executed', async () => {
    await stopTool.execute({});

    // Should create a logger
    sinon.assert.called(createLoggerStub);
  });
});
