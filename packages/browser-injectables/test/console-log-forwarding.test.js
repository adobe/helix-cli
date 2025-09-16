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

/* eslint-disable no-console */
describe('Browser Console Log Forwarding', () => {
  let messages = [];
  let originalConsole = {};

  beforeEach(() => {
    messages = [];
    // Store original console methods
    originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };
  });

  afterEach(() => {
    // Restore console
    Object.assign(console, originalConsole);
  });

  it('should intercept console.log and prepare for WebSocket forwarding', () => {
    // Mock WebSocket send
    const mockSend = (data) => {
      messages.push(JSON.parse(data));
    };

    // Test interceptor function
    const interceptConsole = (level) => {
      const original = originalConsole[level];
      console[level] = function interceptedConsole(...args) {
        original.apply(console, args);

        const logData = {
          command: 'log',
          level,
          args: args.map((arg) => {
            try {
              if (arg instanceof Error) {
                return { type: 'Error', message: arg.message, stack: arg.stack };
              }
              return JSON.parse(JSON.stringify(arg));
            } catch (e) {
              return String(arg);
            }
          }),
          url: window.location.href,
          line: '0',
        };

        mockSend(JSON.stringify(logData));
      };
    };

    // Apply interceptor
    interceptConsole('log');

    // Test console.log
    console.log('Test message', { foo: 'bar' });

    // Check that message was captured
    assert.equal(messages.length, 1);
    assert.equal(messages[0].command, 'log');
    assert.equal(messages[0].level, 'log');
    assert.deepEqual(messages[0].args, ['Test message', { foo: 'bar' }]);
  });

  it('should handle different console levels', () => {
    const mockSend = (data) => {
      messages.push(JSON.parse(data));
    };

    // Intercept all levels
    ['log', 'error', 'warn', 'info'].forEach((level) => {
      const original = originalConsole[level];
      console[level] = function interceptedConsole(...args) {
        original.apply(console, args);
        mockSend(JSON.stringify({
          command: 'log',
          level,
          args,
          url: window.location.href,
          line: '0',
        }));
      };
    });

    // Test different levels
    console.log('Log message');
    console.error('Error message');
    console.warn('Warning message');
    console.info('Info message');

    // Check messages
    assert.equal(messages.length, 4);
    assert.equal(messages[0].level, 'log');
    assert.equal(messages[1].level, 'error');
    assert.equal(messages[2].level, 'warn');
    assert.equal(messages[3].level, 'info');
  });

  it('should handle errors and circular references', () => {
    const mockSend = (data) => {
      messages.push(JSON.parse(data));
    };

    // Intercept console.error
    console.error = function interceptedError(...args) {
      originalConsole.error.apply(console, args);

      const serializedArgs = args.map((arg) => {
        try {
          if (arg instanceof Error) {
            return { type: 'Error', message: arg.message, stack: arg.stack };
          }
          return JSON.parse(JSON.stringify(arg));
        } catch (e) {
          return '[Circular or Complex Object]';
        }
      });

      mockSend(JSON.stringify({
        command: 'log',
        level: 'error',
        args: serializedArgs,
        url: window.location.href,
        line: '0',
      }));
    };

    // Test with Error object
    const error = new Error('Test error');
    console.error('Error occurred:', error);

    // Test with circular reference
    const circular = { a: 1 };
    circular.self = circular;
    console.error('Circular:', circular);

    // Check messages
    assert.equal(messages.length, 2);

    // Check error serialization
    assert.equal(messages[0].args[0], 'Error occurred:');
    assert.equal(messages[0].args[1].type, 'Error');
    assert.equal(messages[0].args[1].message, 'Test error');

    // Check circular reference handling
    assert.equal(messages[1].args[0], 'Circular:');
    assert.equal(messages[1].args[1], '[Circular or Complex Object]');
  });

  it('should only send logs when WebSocket is connected', () => {
    const mockWebSocket = {
      readyState: 0, // CONNECTING
      send: (data) => {
        messages.push(JSON.parse(data));
      },
    };

    // Intercept console with WebSocket state check
    console.log = function interceptedLog(...args) {
      // Sanitize user-controlled input before forwarding/logging
      const sanitizedArgs = args.map((arg) => {
        // Convert all arguments to string and remove newlines and carriage returns
        let str = '';
        if (typeof arg === 'string') {
          str = arg;
        } else if (typeof arg === 'object') {
          try {
            str = JSON.stringify(arg);
          } catch (e) {
            str = '[Unserializable object]';
          }
        } else {
          str = String(arg);
        }
        return str.replace(/[\r\n]+/g, '');
      });

      originalConsole.log.apply(console, sanitizedArgs);

      if (mockWebSocket.readyState === 1) { // OPEN
        mockWebSocket.send(JSON.stringify({
          command: 'log',
          level: 'log',
          args: sanitizedArgs,
          url: window.location.href,
          line: '0',
        }));
      }
    };

    // Try to log when disconnected
    console.log('This should not be sent');
    assert.equal(messages.length, 0);

    // Connect and try again
    mockWebSocket.readyState = 1; // OPEN
    console.log('This should be sent');
    assert.equal(messages.length, 1);
    assert.equal(messages[0].args[0], 'This should be sent');
  });
});
