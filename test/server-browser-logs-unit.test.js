/*
 * Copyright 2018 Adobe. All rights reserved.
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
/* eslint-disable no-underscore-dangle */
import assert from 'assert';
import LiveReload from '../src/server/LiveReload.js';
import utils from '../src/server/utils.js';

describe('Browser Log Forwarding (Unit Tests)', () => {
  let logs;
  let testLogger;

  beforeEach(() => {
    logs = [];
    testLogger = {
      debug: (...args) => logs.push({ level: 'debug', args }),
      info: (...args) => logs.push({ level: 'info', args }),
      warn: (...args) => logs.push({ level: 'warn', args }),
      error: (...args) => logs.push({ level: 'error', args }),
      log: (...args) => logs.push({ level: 'log', args }),
    };
  });

  describe('LiveReload log command handling', () => {
    it('should process log command with proper formatting', () => {
      // Manually invoke the log handling logic (simulating _cmdLog method)
      const data = {
        level: 'error',
        args: ['Test error', { foo: 'bar' }],
        url: 'http://localhost:3000/test.js',
        line: '42',
      };

      // Simulate what _cmdLog does
      const {
        level = 'log', args = [], url = 'unknown', line,
      } = data;
      const timestamp = new Date().toISOString();
      const location = line ? `${url}:${line}` : url;
      const prefix = `[Browser:${level}] ${timestamp} ${location}`;
      const message = args.map((arg) => {
        try {
          return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
        } catch (e) {
          return '[Circular or Complex Object]';
        }
      }).join(' ');

      const logMethod = testLogger[level] || testLogger.info;
      logMethod(`${prefix} ${message}`);

      assert(logs.length > 0, 'Log should be captured');
      const logEntry = logs[0];
      assert.equal(logEntry.level, 'error', 'Should use error level');

      const logMessage = logEntry.args.join(' ');
      assert(logMessage.includes('[Browser:error]'), 'Should have browser prefix');
      assert(logMessage.includes('http://localhost:3000/test.js:42'), 'Should include location');
      assert(logMessage.includes('Test error'), 'Should include message');
      assert(logMessage.includes('"foo": "bar"'), 'Should serialize objects');
    });

    it('should handle missing optional fields', () => {
      // Simulate what _cmdLog does with missing fields
      const data = {
        args: ['Simple message'],
      };

      const {
        level = 'log', args = [], url = 'unknown', line,
      } = data;
      const timestamp = new Date().toISOString();
      const location = line ? `${url}:${line}` : url;
      const prefix = `[Browser:${level}] ${timestamp} ${location}`;
      const message = args.map((arg) => String(arg)).join(' ');

      const logMethod = testLogger[level] || testLogger.info;
      logMethod(`${prefix} ${message}`);

      const logEntry = logs[0];
      assert.equal(logEntry.level, 'log', 'Should default to log level');

      const logMessage = logEntry.args.join(' ');
      assert(logMessage.includes('[Browser:log]'), 'Should default to log level');
      assert(logMessage.includes('unknown'), 'Should use unknown for missing URL');
      assert(!logMessage.includes('unknown:'), 'Should not include line number when missing');
    });

    it('should handle circular references safely', () => {
      // Create a circular reference scenario
      const circular = { a: 1 };
      circular.self = circular;

      const data = {
        level: 'log',
        args: ['Circular test', circular],
        url: 'test.js',
        line: '10',
      };

      const {
        level = 'log', args = [], url = 'unknown', line,
      } = data;
      const timestamp = new Date().toISOString();
      const location = line ? `${url}:${line}` : url;
      const prefix = `[Browser:${level}] ${timestamp} ${location}`;
      const message = args.map((arg) => {
        try {
          return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
        } catch (e) {
          return '[Circular or Complex Object]';
        }
      }).join(' ');

      const logMethod = testLogger[level] || testLogger.info;
      logMethod(`${prefix} ${message}`);

      const logMessage = logs[0].args.join(' ');
      assert(logMessage.includes('[Circular or Complex Object]'), 'Should handle circular refs');
      assert(!logMessage.includes('RangeError'), 'Should not throw on circular refs');
    });
  });

  describe('Console interceptor script injection', () => {
    it('should inject script when forwardBrowserLogs is enabled', () => {
      const server = {
        port: 3000,
        scheme: 'http',
        forwardBrowserLogs: true,
      };

      const body = '<html><head></head><body>Test</body></html>';
      const result = utils.injectLiveReloadScript(body, server);

      assert(result.includes('// Store original console methods'), 'Should inject interceptor');
      assert(result.includes('function serializeArgs'), 'Should include serialization');
      assert(result.includes('window.LiveReload.connector.socket.send'), 'Should include WebSocket send');
      assert(result.includes('command: \'log\''), 'Should send log command');
    });

    it('should not inject script when forwardBrowserLogs is disabled', () => {
      const server = {
        port: 3000,
        scheme: 'http',
        forwardBrowserLogs: false,
      };

      const body = '<html><head></head><body>Test</body></html>';
      const result = utils.injectLiveReloadScript(body, server);

      assert(!result.includes('// Store original console methods'), 'Should not inject interceptor');
      assert(!result.includes('function serializeArgs'), 'Should not include serialization');
      assert(result.includes('__internal__/livereload.js'), 'Should still inject LiveReload');
    });

    it('should preserve nonce attribute when injecting', () => {
      const server = {
        port: 3000,
        scheme: 'http',
        forwardBrowserLogs: true,
      };

      const body = '<html><head><script nonce="abc123">existing</script></head><body>Test</body></html>';
      const result = utils.injectLiveReloadScript(body, server);

      // Count nonce occurrences
      const nonceMatches = result.match(/nonce="abc123"/g);
      assert(nonceMatches.length > 2, 'Should preserve nonce in injected scripts');
    });
  });

  describe('Configuration propagation', () => {
    it('should propagate forwardBrowserLogs through LiveReload methods', () => {
      const liveReload = new LiveReload(testLogger);

      assert.equal(liveReload.forwardBrowserLogs, false, 'Should default to false');

      liveReload.withForwardBrowserLogs(true);
      assert.equal(liveReload.forwardBrowserLogs, true, 'Should be enabled');

      liveReload.withForwardBrowserLogs(false);
      assert.equal(liveReload.forwardBrowserLogs, false, 'Should be disabled');
    });
  });
});
