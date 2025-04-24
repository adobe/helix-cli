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

describe('MCP Tools - up', () => {
  // Stubs for dependencies
  let runStub;
  let mockUpCommandImpl;
  let upCommandStub;
  let registerServerStub;
  let mockLoggerInstance;
  let createLoggerStub;
  let upTool;

  beforeEach(async () => {
    // Create stubs
    runStub = sinon.stub().resolves();

    // Create a mock UpCommandImpl with chainable methods
    mockUpCommandImpl = {
      withHttpPort: sinon.stub().returnsThis(),
      withBindAddr: sinon.stub().returnsThis(),
      withOpen: sinon.stub().returnsThis(),
      withTLS: sinon.stub().returnsThis(),
      withLiveReload: sinon.stub().returnsThis(),
      withUrl: sinon.stub().returnsThis(),
      withSiteToken: sinon.stub().returnsThis(),
      withAllowInsecure: sinon.stub().returnsThis(),
      withPrintIndex: sinon.stub().returnsThis(),
      run: runStub,
    };

    // Create stub for UpCommandImpl constructor
    upCommandStub = sinon.stub().returns(mockUpCommandImpl);

    // Create stub for registerServer
    registerServerStub = sinon.stub();

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
    upTool = await esmock('../src/tools/up.js', {
      '../src/up.cmd.js': { default: upCommandStub },
      '../src/mcp-logger.js': { createInMemoryLogger: createLoggerStub },
      '../src/tools/stop.js': { registerServer: registerServerStub },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('has the correct name and description', () => {
    assert.strictEqual(upTool.default.name, 'up');
    assert.ok(upTool.default.description.includes('Run an AEM development server'));
  });

  it('has the expected input schema', () => {
    const schema = upTool.default.inputSchema;
    assert.strictEqual(schema.type, 'object');

    // Check presence of expected properties
    const expectedProps = ['port', 'addr', 'open', 'livereload', 'url', 'tlsCert', 'tlsKey'];
    expectedProps.forEach((prop) => {
      assert.ok(schema.properties[prop], `Schema should include ${prop} property`);
    });

    // Check defaults for some properties
    assert.strictEqual(schema.properties.port.default, 3000);
    assert.strictEqual(schema.properties.livereload.default, true);
  });

  it('creates a logger with correct category', async () => {
    await upTool.default.execute({});
    sinon.assert.calledWith(createLoggerStub, 'up');
  });

  it('configures server with default values', async () => {
    await upTool.default.execute({});

    sinon.assert.calledWith(mockUpCommandImpl.withHttpPort, 3000);
    sinon.assert.calledWith(mockUpCommandImpl.withBindAddr, '127.0.0.1');
    sinon.assert.calledWith(mockUpCommandImpl.withOpen, false);
    sinon.assert.calledWith(mockUpCommandImpl.withLiveReload, true);
  });

  it('configures server with custom values', async () => {
    const args = {
      port: '8080',
      addr: '0.0.0.0',
      open: '/content',
      livereload: false,
      url: 'https://example.com',
      tlsCert: '/path/to/cert.pem',
      tlsKey: '/path/to/key.pem',
      siteToken: 'token123',
      allowInsecure: true,
      printIndex: true,
    };

    await upTool.default.execute(args);

    sinon.assert.calledWith(mockUpCommandImpl.withHttpPort, 8080);
    sinon.assert.calledWith(mockUpCommandImpl.withBindAddr, '0.0.0.0');
    sinon.assert.calledWith(mockUpCommandImpl.withOpen, '/content');
    sinon.assert.calledWith(mockUpCommandImpl.withTLS, '/path/to/key.pem', '/path/to/cert.pem');
    sinon.assert.calledWith(mockUpCommandImpl.withLiveReload, false);
    sinon.assert.calledWith(mockUpCommandImpl.withUrl, 'https://example.com');
    sinon.assert.calledWith(mockUpCommandImpl.withSiteToken, 'token123');
    sinon.assert.calledWith(mockUpCommandImpl.withAllowInsecure, true);
    sinon.assert.calledWith(mockUpCommandImpl.withPrintIndex, true);
  });

  it('parses port number from string', async () => {
    await upTool.default.execute({ port: '4200' });
    sinon.assert.calledWith(mockUpCommandImpl.withHttpPort, 4200);
  });

  it('registers the server instance for later stopping', async () => {
    await upTool.default.execute({ port: 5000 });
    sinon.assert.calledWith(registerServerStub, 5000, mockUpCommandImpl);
  });

  it('runs the server without blocking', async () => {
    await upTool.default.execute({});
    sinon.assert.called(runStub);
  });

  it('returns success message with port information', async () => {
    const result = await upTool.default.execute({ port: 5000 });

    assert.strictEqual(result.isError, false);
    assert.ok(Array.isArray(result.content));
    assert.strictEqual(result.content[0].type, 'text');
    assert.ok(result.content[0].text.includes('5000'));
  });

  it('handles errors during execution', async () => {
    const error = new Error('Test error');
    upCommandStub.throws(error);

    const result = await upTool.default.execute({});

    assert.strictEqual(result.isError, true);
    assert.ok(result.content[0].text.includes('Test error'));
  });

  it('handles errors during server start', async () => {
    const error = new Error('Run error');
    runStub.rejects(error);

    await upTool.default.execute({});
    sinon.assert.calledWith(mockLoggerInstance.error, sinon.match(/Run error/));
  });
});
