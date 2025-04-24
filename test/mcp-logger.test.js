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
import {
  createInMemoryLogger, getLogs, createLoggerFactory, resetLogs,
} from '../src/mcp-logger.js';

describe('MCP Logger', () => {
  beforeEach(() => {
    // Clear logs between tests using resetLogs
    resetLogs();
  });

  it('creates a logger with default category', () => {
    const logger = createInMemoryLogger();
    assert.strictEqual(logger.category, 'mcp');
  });

  it('creates a logger with custom category', () => {
    const logger = createInMemoryLogger('test');
    assert.strictEqual(logger.category, 'test');
  });

  it('logs messages with different levels', () => {
    const logger = createInMemoryLogger('test');
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');

    const logs = getLogs();
    assert.strictEqual(logs.length, 4);

    assert.strictEqual(logs[0].level, 'debug');
    assert.strictEqual(logs[0].message, 'Debug message');
    assert.strictEqual(logs[0].context.category, 'test');

    assert.strictEqual(logs[1].level, 'info');
    assert.strictEqual(logs[1].message, 'Info message');

    assert.strictEqual(logs[2].level, 'warn');
    assert.strictEqual(logs[2].message, 'Warning message');

    assert.strictEqual(logs[3].level, 'error');
    assert.strictEqual(logs[3].message, 'Error message');
  });

  it('logs messages with additional context', () => {
    const logger = createInMemoryLogger('test');

    logger.info('Message with context', { user: 'testuser', id: 123 });

    const logs = getLogs();
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].message, 'Message with context');
    assert.strictEqual(logs[0].context.user, 'testuser');
    assert.strictEqual(logs[0].context.id, 123);
    assert.strictEqual(logs[0].context.category, 'test');
  });

  it('does not override existing category in context', () => {
    const logger = createInMemoryLogger('test');

    logger.info('Message with custom category', { category: 'custom' });

    const logs = getLogs();
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].context.category, 'custom');
  });

  it('limits the number of stored logs', () => {
    const logger = createInMemoryLogger('test');

    // Generate more logs than the limit (1000 is the default in the implementation)
    for (let i = 0; i < 1100; i += 1) {
      logger.info(`Log message ${i}`);
    }

    const logs = getLogs(1100);
    assert.strictEqual(logs.length, 1000); // Only the last 1000 should be kept
    assert.strictEqual(logs[0].message, 'Log message 100'); // First log should be 100
    assert.strictEqual(logs[999].message, 'Log message 1099'); // Last log should be 1099
  });

  it('filters logs by text', () => {
    const logger = createInMemoryLogger('test');

    logger.info('apple message');
    logger.info('banana message');
    logger.info('apple and orange');

    const logs = getLogs(10, 'apple');
    assert.strictEqual(logs.length, 2);
    assert.strictEqual(logs[0].message, 'apple message');
    assert.strictEqual(logs[1].message, 'apple and orange');
  });

  it('filters logs by context', () => {
    const logger = createInMemoryLogger('test');

    logger.info('message 1', { fruit: 'apple' });
    logger.info('message 2', { fruit: 'banana' });
    logger.info('message 3', { fruit: 'apple' });

    const logs = getLogs(10, 'apple');
    assert.strictEqual(logs.length, 2);
    assert.strictEqual(logs[0].message, 'message 1');
    assert.strictEqual(logs[1].message, 'message 3');
  });

  it('filters logs by level', () => {
    const logger = createInMemoryLogger('test');

    logger.debug('debug message');
    logger.info('info message');

    const logs = getLogs(10, 'debug');
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].message, 'debug message');
  });

  it('limits the number of returned logs', () => {
    const logger = createInMemoryLogger('test');

    logger.info('message 1');
    logger.info('message 2');
    logger.info('message 3');

    const logs = getLogs(2);
    assert.strictEqual(logs.length, 2);
    assert.strictEqual(logs[0].message, 'message 2');
    assert.strictEqual(logs[1].message, 'message 3');
  });

  it('creates a logger factory', () => {
    const factory = createLoggerFactory();
    const logger = factory('custom');

    assert.strictEqual(logger.category, 'custom');

    logger.info('Factory created logger');

    const logs = getLogs();
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].message, 'Factory created logger');
    assert.strictEqual(logs[0].context.category, 'custom');
  });

  it('returns timestamps with logs', () => {
    const logger = createInMemoryLogger();

    logger.info('Test timestamp');

    const logs = getLogs();
    assert.strictEqual(logs.length, 1);
    assert(logs[0].timestamp); // Ensure timestamp exists
    assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(logs[0].timestamp)); // ISO format
  });

  it('filters logs by seconds', () => {
    const logger = createInMemoryLogger('test');

    // Create a log entry with a timestamp that is 30 seconds old
    const oldDate = new Date(Date.now() - 30000);

    // Create an old message with explicit timestamp
    logger.info('Old message');

    // Manually edit timestamps - we'll directly add it back to the logs with proper timestamp
    resetLogs(); // Clear logs

    // Add back the old message with modified timestamp
    logger.info('Old message');
    const currentLogs = getLogs();
    // We need to modify the global LOG_BUFFER directly
    // This is a hack for testing, not something we'd normally do
    // Get a reference to the last log entry and modify its timestamp
    currentLogs[0].timestamp = oldDate.toISOString();

    // Now log a new message
    logger.info('New message');

    // Filter logs from the last 10 seconds
    const recentLogs = getLogs(10, null, 10);
    assert.strictEqual(recentLogs.length, 1);
    assert.strictEqual(recentLogs[0].message, 'New message');

    // Get all logs without time filtering
    const allLogsAgain = getLogs();
    assert.strictEqual(allLogsAgain.length, 2);
  });

  it('filters logs by log levels', () => {
    const logger = createInMemoryLogger('test');

    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');

    // Filter only error and warn levels
    const highLevelLogs = getLogs(10, null, null, ['error', 'warn']);
    assert.strictEqual(highLevelLogs.length, 2);
    assert.strictEqual(highLevelLogs[0].level, 'warn');
    assert.strictEqual(highLevelLogs[1].level, 'error');

    // Filter only debug level
    const debugLogs = getLogs(10, null, null, ['debug']);
    assert.strictEqual(debugLogs.length, 1);
    assert.strictEqual(debugLogs[0].level, 'debug');
  });

  it('combines all filters - text, seconds, and levels', () => {
    const logger = createInMemoryLogger('test');

    // Create logs with different timestamps and levels
    const oldDate = new Date(Date.now() - 30000);

    // Create test logs
    logger.debug('Old debug apple');
    logger.info('Old info apple');
    logger.warn('Old warn banana');
    logger.error('Old error apple');

    // Clear logs and add back with modified timestamps
    resetLogs();

    // Add the old logs back with modified timestamps
    logger.debug('Old debug apple');
    logger.info('Old info apple');
    logger.warn('Old warn banana');
    logger.error('Old error apple');

    // Get the logs and modify their timestamps
    const currentLogs = getLogs();
    // Update timestamps for all logs
    for (let i = 0; i < currentLogs.length; i += 1) {
      currentLogs[i].timestamp = oldDate.toISOString();
    }

    // Add new logs
    logger.debug('New debug apple');
    logger.info('New info banana');
    logger.warn('New warn apple');
    logger.error('New error banana');

    // Filter: recent logs (within 10s), containing 'apple', only warn/error levels
    const filteredLogs = getLogs(10, 'apple', 10, ['warn', 'error']);

    assert.strictEqual(filteredLogs.length, 1);
    assert.strictEqual(filteredLogs[0].message, 'New warn apple');
    assert.strictEqual(filteredLogs[0].level, 'warn');
  });
});
