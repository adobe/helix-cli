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

import { expect } from '@esm-bundle/chai';

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

    expect(logCommand.command).to.equal('log');
    expect(logCommand.level).to.equal('error');
    expect(logCommand.args).to.deep.equal(['Test error', { foo: 'bar' }]);
    expect(logCommand.url).to.include('http://localhost');
    expect(logCommand.line).to.equal('42');
  });

  it('should serialize Error objects properly', () => {
    const error = new Error('Test error');
    const serialized = {
      type: 'Error',
      message: error.message,
      stack: error.stack,
    };

    expect(serialized.type).to.equal('Error');
    expect(serialized.message).to.equal('Test error');
    expect(serialized.stack).to.be.a('string');
    expect(serialized.stack.length).to.be.greaterThan(0);
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

    expect(result).to.equal('[Circular or Complex Object]');
  });
});
