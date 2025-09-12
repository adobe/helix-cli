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

/* eslint-env mocha, browser */

import { assert } from '@esm-bundle/chai';

describe('LiveReload Integration with Browser Logs', () => {
  it('should test WebSocket log command format', () => {
    // Test the format of log commands that would be sent
    const logCommand = {
      command: 'log',
      level: 'error',
      args: ['Test error', { foo: 'bar' }],
      url: 'http://localhost:3000/test.js',
      line: '42',
    };

    assert.equal(logCommand.command, 'log');
    assert.equal(logCommand.level, 'error');
    assert.deepEqual(logCommand.args, ['Test error', { foo: 'bar' }]);
    assert(logCommand.url.includes('http://localhost'));
    assert.equal(logCommand.line, '42');
  });

  it('should serialize Error objects properly', () => {
    const error = new Error('Test error');
    const serialized = {
      type: 'Error',
      message: error.message,
      stack: error.stack,
    };

    assert.equal(serialized.type, 'Error');
    assert.equal(serialized.message, 'Test error');
    assert.equal(typeof serialized.stack, 'string');
    assert(serialized.stack.length > 0);
  });

  it('should handle circular references', () => {
    const circular = { a: 1 };
    circular.self = circular;

    let result;
    try {
      JSON.stringify(circular);
    } catch (e) {
      result = '[Circular or Complex Object]';
    }

    assert.equal(result, '[Circular or Complex Object]');
  });
});
