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

describe('MCP Tools - logs', () => {
  let getLogsStub;
  let logsTool;

  beforeEach(async () => {
    // Sample log data to return from the stub
    const sampleLogs = [
      {
        timestamp: '2023-04-24T00:00:00.000Z',
        level: 'info',
        message: 'Test log message',
        context: { category: 'test' },
      },
    ];

    // Create stub for getLogs function
    getLogsStub = sinon.stub().returns(sampleLogs);

    // Mock the dependencies
    logsTool = await esmock('../src/tools/logs.js', {
      '../src/mcp-logger.js': { getLogs: getLogsStub },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('has the correct name and description', () => {
    assert.strictEqual(logsTool.default.name, 'logs');
    assert.ok(logsTool.default.description.includes('Retrieve the last log entries'));
  });

  it('has the expected input schema', () => {
    const schema = logsTool.default.inputSchema;
    assert.strictEqual(schema.type, 'object');

    // Check presence of expected properties
    const expectedProps = ['lines', 'seconds', 'filter', 'levels'];
    expectedProps.forEach((prop) => {
      assert.ok(schema.properties[prop], `Schema should include ${prop} property`);
    });

    // Check defaults for some properties
    assert.strictEqual(schema.properties.lines.default, 20);
    assert.deepStrictEqual(schema.properties.levels.default, ['info', 'warn', 'error']);
  });

  it('uses default values when no args provided', async () => {
    await logsTool.default.execute({});

    sinon.assert.calledWith(getLogsStub, 20, '', null, null);
  });

  it('passes arguments to getLogs function', async () => {
    const args = {
      lines: 50,
      filter: 'error',
      seconds: 60,
      levels: ['debug', 'error'],
    };

    await logsTool.default.execute(args);

    sinon.assert.calledWith(getLogsStub, 50, 'error', 60, ['debug', 'error']);
  });

  it('returns log entries as JSON in the response', async () => {
    const result = await logsTool.default.execute({});

    assert.strictEqual(result.isError, false);
    assert.ok(Array.isArray(result.content));
    assert.strictEqual(result.content[0].type, 'text');

    // Check that the response contains JSON
    const parsedContent = JSON.parse(result.content[0].text);
    assert.ok(Array.isArray(parsedContent));
    assert.strictEqual(parsedContent[0].message, 'Test log message');
  });

  it('handles errors gracefully', async () => {
    const error = new Error('Test error');
    getLogsStub.throws(error);

    const result = await logsTool.default.execute({});

    assert.strictEqual(result.isError, true);
    assert.ok(result.content[0].text.includes('Test error'));
  });
});
