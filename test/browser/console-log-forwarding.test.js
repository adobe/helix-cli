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
/* global window */
/* eslint-disable no-console */

import { expect } from '@esm-bundle/chai';

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
    expect(messages).to.have.lengthOf(1);
    expect(messages[0].command).to.equal('log');
    expect(messages[0].level).to.equal('log');
    expect(messages[0].args).to.deep.equal(['Test message', { foo: 'bar' }]);
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
    expect(messages).to.have.lengthOf(4);
    expect(messages[0].level).to.equal('log');
    expect(messages[1].level).to.equal('error');
    expect(messages[2].level).to.equal('warn');
    expect(messages[3].level).to.equal('info');
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
    expect(messages).to.have.lengthOf(2);

    // Check error serialization
    expect(messages[0].args[0]).to.equal('Error occurred:');
    expect(messages[0].args[1]).to.have.property('type', 'Error');
    expect(messages[0].args[1]).to.have.property('message', 'Test error');

    // Check circular reference handling
    expect(messages[1].args[0]).to.equal('Circular:');
    expect(messages[1].args[1]).to.equal('[Circular or Complex Object]');
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
      originalConsole.log.apply(console, args);

      if (mockWebSocket.readyState === 1) { // OPEN
        mockWebSocket.send(JSON.stringify({
          command: 'log',
          level: 'log',
          args,
          url: window.location.href,
          line: '0',
        }));
      }
    };

    // Try to log when disconnected
    console.log('This should not be sent');
    expect(messages).to.have.lengthOf(0);

    // Connect and try again
    mockWebSocket.readyState = 1; // OPEN
    console.log('This should be sent');
    expect(messages).to.have.lengthOf(1);
    expect(messages[0].args[0]).to.equal('This should be sent');
  });
});
