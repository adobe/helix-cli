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
import { Nock } from './utils.js';
import { checkForUpdates } from '../src/update-check.js';

describe('Update Check Tests', () => {
  let nock;
  let logMessages;
  let mockLogger;

  beforeEach(() => {
    nock = new Nock();
    logMessages = {
      warn: [],
      debug: [],
    };
    mockLogger = {
      warn: (msg) => logMessages.warn.push(msg),
      debug: (msg) => logMessages.debug.push(msg),
      level: 'info',
    };
  });

  afterEach(() => {
    nock.done();
  });

  it('should notify when newer version is available', async () => {
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli/latest')
      .reply(200, {
        version: '99.99.99',
      });

    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should have logged update notification
    assert.ok(logMessages.warn.length > 0, 'Should have logged warning messages');
    assert.ok(
      logMessages.warn.some((msg) => msg.includes('Update available')),
      'Should include update available message',
    );
    assert.ok(
      logMessages.warn.some((msg) => msg.includes('99.99.99')),
      'Should include new version number',
    );
  });

  it('should not notify when current version is latest', async () => {
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli/latest')
      .reply(200, {
        version: '1.0.0',
      });

    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should not have logged any warnings
    assert.strictEqual(logMessages.warn.length, 0, 'Should not log warnings when up to date');
  });

  it('should not notify when current version is newer (pre-release)', async () => {
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli/latest')
      .reply(200, {
        version: '1.0.0',
      });

    await checkForUpdates('@adobe/aem-cli', '2.0.0', mockLogger);

    // Should not have logged any warnings
    assert.strictEqual(logMessages.warn.length, 0, 'Should not log warnings when using newer version');
  });

  it('should handle network errors gracefully', async () => {
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli/latest')
      .replyWithError('Network error');

    // Should not throw
    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should not have logged any warnings
    assert.strictEqual(logMessages.warn.length, 0, 'Should not log warnings on error');
  });

  it('should handle timeout gracefully', async function timeoutTest() {
    // Increase test timeout for this specific test
    this.timeout(10000);

    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli/latest')
      .delayConnection(6000) // 6 second delay, longer than 5 second timeout in checkForUpdates
      .reply(200, { version: '99.99.99' });

    // Should not throw
    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should not have logged any warnings (timeout before response)
    assert.strictEqual(logMessages.warn.length, 0, 'Should not log warnings on timeout');
  });

  it('should handle 404 responses gracefully', async () => {
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli/latest')
      .reply(404);

    // Should not throw
    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should not have logged any warnings
    assert.strictEqual(logMessages.warn.length, 0, 'Should not log warnings on 404');
  });

  it('should handle malformed response gracefully', async () => {
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli/latest')
      .reply(200, 'not json');

    // Should not throw
    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should not have logged any warnings
    assert.strictEqual(logMessages.warn.length, 0, 'Should not log warnings on malformed response');
  });

  it('should handle missing version in response gracefully', async () => {
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli/latest')
      .reply(200, {});

    // Should not throw
    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should not have logged any warnings
    assert.strictEqual(logMessages.warn.length, 0, 'Should not log warnings when version missing');
  });
});
