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
/* eslint-disable func-names */
import assert from 'assert';
import path from 'path';
import nock from 'nock';
import { HelixImportProject } from '../src/server/HelixImportProject.js';
import { createTestRoot, setupProject, rawGet } from './utils.js';

const TEST_DIR = path.resolve(__rootdir, 'test', 'fixtures', 'import');

describe('Dump Headers Functionality', () => {
  let testRoot;

  beforeEach(async () => {
    testRoot = await createTestRoot();
  });

  afterEach(async () => {
    nock.cleanAll();
  });

  describe('HelixImportProject', () => {
    it('should enable dump headers when set', async () => {
      const project = new HelixImportProject()
        .withDumpHeaders(true);

      assert.strictEqual(project.dumpHeaders, true);
    });

    it('should disable dump headers by default', async () => {
      const project = new HelixImportProject();

      assert.strictEqual(project.dumpHeaders, false);
    });

    it('should set dump headers via withDumpHeaders', async () => {
      const project = new HelixImportProject()
        .withDumpHeaders(true);

      assert.strictEqual(project.dumpHeaders, true);

      const project2 = project.withDumpHeaders(false);
      assert.strictEqual(project2.dumpHeaders, false);
    });
  });

  describe('Dump Headers Output', () => {
    it('should output headers when dump-headers is enabled', async () => {
      const cwd = await setupProject(TEST_DIR, testRoot);

      // Create a mock logger that captures log messages
      const logMessages = [];
      const mockLogger = {
        info: (message) => {
          logMessages.push({ level: 'info', message });
        },
        debug: (message) => {
          logMessages.push({ level: 'debug', message });
        },
        error: (message) => {
          logMessages.push({ level: 'error', message });
        },
        warn: (message) => {
          logMessages.push({ level: 'warn', message });
        },
      };

      const project = new HelixImportProject()
        .withCwd(cwd)
        .withHttpPort(0)
        .withDumpHeaders(true)
        .withLogger(mockLogger);

      await project.init();

      try {
        await project.start();

        // Mock the external server
        nock('http://example.com')
          .get('/')
          .reply(200, 'OK');

        // Make a request through the proxy
        const response = await rawGet('127.0.0.1', project.server.port, '/?host=http://example.com', {
          'user-agent': 'test-agent',
          accept: 'text/html',
          'custom-header': 'custom-value',
        });

        // Verify the request was successful
        assert.match(response.toString(), /^HTTP\/1\.1 200 OK/);

        // Check that debug headers were logged
        const headerLogs = logMessages.filter((log) => log.message.includes('=== REQUEST HEADERS ===')
          || log.message.includes('Request URL:')
          || log.message.includes('Request Method:')
          || log.message.includes('user-agent:')
          || log.message.includes('accept:')
          || log.message.includes('custom-header:'));

        assert.ok(headerLogs.length > 0, 'No header debug logs found');

        // Verify the header dump structure
        const headerDumpStart = logMessages.findIndex((log) => log.message === '=== REQUEST HEADERS ===');
        assert.ok(headerDumpStart >= 0, 'Header dump start marker not found');

        const headerDumpEnd = logMessages.findIndex((log) => log.message === '=======================');
        assert.ok(headerDumpEnd >= 0, 'Header dump end marker not found');
        assert.ok(headerDumpEnd > headerDumpStart, 'Header dump end before start');

        // Verify that at least some headers are being logged
        const headerEntries = logMessages.slice(headerDumpStart + 1, headerDumpEnd);
        const hasHeaders = headerEntries.some((entry) => entry.message.includes(':'));
        assert.ok(hasHeaders, 'No header entries found in debug output');

        // Verify that the basic structure is correct
        const hasRequestUrl = logMessages.some((log) => log.message.startsWith('Request URL:'));
        const hasRequestMethod = logMessages.some((log) => log.message.startsWith('Request Method:'));

        assert.ok(hasRequestUrl, 'Request URL not logged');
        assert.ok(hasRequestMethod, 'Request Method not logged');
      } finally {
        await project.stop();
      }
    });

    it('should not output headers when dump-headers is disabled', async () => {
      const cwd = await setupProject(TEST_DIR, testRoot);

      // Create a mock logger that captures log messages
      const logMessages = [];
      const mockLogger = {
        info: (message) => {
          logMessages.push({ level: 'info', message });
        },
        debug: (message) => {
          logMessages.push({ level: 'debug', message });
        },
        error: (message) => {
          logMessages.push({ level: 'error', message });
        },
        warn: (message) => {
          logMessages.push({ level: 'warn', message });
        },
      };

      const project = new HelixImportProject()
        .withCwd(cwd)
        .withHttpPort(0)
        .withDumpHeaders(false)
        .withLogger(mockLogger);

      await project.init();

      try {
        await project.start();

        // Mock the external server
        nock('http://example.com')
          .get('/')
          .reply(200, 'OK');

        // Make a request through the proxy
        const response = await rawGet('127.0.0.1', project.server.port, '/?host=http://example.com', {
          'user-agent': 'test-agent',
          accept: 'text/html',
        });

        // Verify the request was successful
        assert.match(response.toString(), /^HTTP\/1\.1 200 OK/);

        // Check that debug headers were NOT logged
        const headerLogs = logMessages.filter((log) => log.message.includes('=== REQUEST HEADERS ===')
          || log.message.includes('Request URL:')
          || log.message.includes('Request Method:'));

        assert.strictEqual(headerLogs.length, 0, 'Header debug logs found when dump-headers is disabled');
      } finally {
        await project.stop();
      }
    });

    it('should include custom headers from headers.json file in debug output', async () => {
      const cwd = await setupProject(TEST_DIR, testRoot);

      // Create a mock logger that captures log messages
      const logMessages = [];
      const mockLogger = {
        info: (message) => {
          logMessages.push({ level: 'info', message });
        },
        debug: (message) => {
          logMessages.push({ level: 'debug', message });
        },
        error: (message) => {
          logMessages.push({ level: 'error', message });
        },
        warn: (message) => {
          logMessages.push({ level: 'warn', message });
        },
      };

      const project = new HelixImportProject()
        .withCwd(cwd)
        .withHttpPort(0)
        .withDumpHeaders(true)
        .withHeadersFile('test/fixtures/import/headers.json')
        .withLogger(mockLogger);

      await project.init();

      try {
        await project.start();

        // Mock the external server
        nock('http://example.com')
          .get('/')
          .reply(200, 'OK');

        // Make a request through the proxy
        const response = await rawGet('127.0.0.1', project.server.port, '/?host=http://example.com');

        // Verify the request was successful
        assert.match(response.toString(), /^HTTP\/1\.1 200 OK/);

        // Check that custom headers from headers.json were logged
        const headerLogs = logMessages.filter((log) => log.message.includes('Cookie:')
          || log.message.includes('Authorization_test:'));

        assert.ok(headerLogs.length > 0, 'Custom headers from headers.json not logged');

        // Verify specific custom headers were logged
        const headerEntries = logMessages.filter((log) => log.message.includes('Cookie:') || log.message.includes('Authorization_test:'));

        const cookieHeader = headerEntries.find((entry) => entry.message.startsWith('Cookie:'));
        const authHeader = headerEntries.find((entry) => entry.message.startsWith('Authorization_test:'));

        assert.ok(cookieHeader, 'Cookie header not found in debug output');
        assert.ok(authHeader, 'Authorization_test header not found in debug output');
        assert.ok(cookieHeader.message.includes('session_id=1234567890'), 'Cookie header value not correct');
        assert.ok(authHeader.message.includes('Bearer your_token_here'), 'Authorization header value not correct');
      } finally {
        await project.stop();
      }
    });
  });
});
