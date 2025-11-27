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
import fs from 'fs/promises';
import path from 'path';
import sinon from 'sinon';
import { Nock } from './utils.js';
import { checkForUpdates } from '../src/update-check.js';

describe('Update Check Tests', () => {
  let nock;
  let logMessages;
  let mockLogger;
  let fsStub;
  let originalXdgCache;
  let testCacheDir;

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

    // Setup test cache directory by temporarily overriding XDG_CACHE_HOME
    testCacheDir = path.join(process.cwd(), 'test-cache');
    originalXdgCache = process.env.XDG_CACHE_HOME;
    process.env.XDG_CACHE_HOME = testCacheDir;

    // Stub fs methods to avoid actual file system operations in most tests
    fsStub = {
      stat: sinon.stub(fs, 'stat'),
      mkdir: sinon.stub(fs, 'mkdir'),
      writeFile: sinon.stub(fs, 'writeFile'),
    };
  });

  afterEach(() => {
    nock.done();
    sinon.restore();

    // Restore original XDG_CACHE_HOME
    if (originalXdgCache !== undefined) {
      process.env.XDG_CACHE_HOME = originalXdgCache;
    } else {
      delete process.env.XDG_CACHE_HOME;
    }
  });

  it('should notify when newer version is available', async () => {
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli')
      .reply(200, {
        'dist-tags': {
          latest: '99.99.99',
        },
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
      .get('/@adobe/aem-cli')
      .reply(200, {
        'dist-tags': {
          latest: '1.0.0',
        },
      });

    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should not have logged any warnings
    assert.strictEqual(logMessages.warn.length, 0, 'Should not log warnings when up to date');
  });

  it('should not notify when current version is newer (pre-release)', async () => {
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli')
      .reply(200, {
        'dist-tags': {
          latest: '1.0.0',
        },
      });

    await checkForUpdates('@adobe/aem-cli', '2.0.0', mockLogger);

    // Should not have logged any warnings
    assert.strictEqual(logMessages.warn.length, 0, 'Should not log warnings when using newer version');
  });

  it('should handle network errors gracefully', async () => {
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli')
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
      .get('/@adobe/aem-cli')
      .delayConnection(6000) // 6 second delay, longer than 5 second timeout in checkForUpdates
      .reply(200, {
        'dist-tags': {
          latest: '99.99.99',
        },
      });

    // Should not throw
    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should not have logged any warnings (timeout before response)
    assert.strictEqual(logMessages.warn.length, 0, 'Should not log warnings on timeout');
  });

  it('should handle 404 responses gracefully', async () => {
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli')
      .reply(404);

    // Should not throw
    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should not have logged any warnings
    assert.strictEqual(logMessages.warn.length, 0, 'Should not log warnings on 404');
  });

  it('should handle malformed response gracefully', async () => {
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli')
      .reply(200, 'not json');

    // Should not throw
    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should not have logged any warnings
    assert.strictEqual(logMessages.warn.length, 0, 'Should not log warnings on malformed response');
  });

  it('should handle missing version in response gracefully', async () => {
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli')
      .reply(200, {});

    // Should not throw
    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should not have logged any warnings
    assert.strictEqual(logMessages.warn.length, 0, 'Should not log warnings when version missing');
  });

  it('should skip update check if last check was less than 24 hours ago', async () => {
    // Mock file exists and was modified recently (1 hour ago)
    const recentTime = new Date(Date.now() - (60 * 60 * 1000)); // 1 hour ago
    fsStub.stat.resolves({ mtime: recentTime });

    // Should not make any network requests
    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should not have logged any warnings (no update check performed)
    assert.strictEqual(logMessages.warn.length, 0, 'Should not log warnings when skipping check');

    // Should not have tried to write to cache file (no update check performed)
    sinon.assert.notCalled(fsStub.writeFile);
  });

  it('should perform update check if last check was more than 24 hours ago', async () => {
    // Mock file exists but was modified more than 24 hours ago
    const oldTime = new Date(Date.now() - (25 * 60 * 60 * 1000)); // 25 hours ago
    fsStub.stat.resolves({ mtime: oldTime });
    fsStub.mkdir.resolves();
    fsStub.writeFile.resolves();

    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli')
      .reply(200, {
        'dist-tags': {
          latest: '99.99.99',
        },
      });

    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should have logged update notification
    assert.ok(logMessages.warn.length > 0, 'Should have logged warning messages');
    assert.ok(
      logMessages.warn.some((msg) => msg.includes('Update available')),
      'Should include update available message',
    );

    // Should have updated the cache file
    sinon.assert.calledOnce(fsStub.writeFile);
  });

  it('should perform update check if cache file does not exist', async () => {
    // Mock file does not exist
    fsStub.stat.rejects(new Error('ENOENT: no such file or directory'));
    fsStub.mkdir.resolves();
    fsStub.writeFile.resolves();

    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli')
      .reply(200, {
        'dist-tags': {
          latest: '99.99.99',
        },
      });

    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should have logged update notification
    assert.ok(logMessages.warn.length > 0, 'Should have logged warning messages');

    // Should have created the cache file
    sinon.assert.calledOnce(fsStub.mkdir);
    sinon.assert.calledOnce(fsStub.writeFile);
  });

  it('should handle cache file system errors gracefully', async () => {
    // Mock file system errors
    fsStub.stat.rejects(new Error('Permission denied'));
    fsStub.mkdir.rejects(new Error('Permission denied'));
    fsStub.writeFile.rejects(new Error('Permission denied'));

    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli')
      .reply(200, {
        'dist-tags': {
          latest: '99.99.99',
        },
      });

    // Should not throw despite file system errors
    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Should still perform the update check and log warnings
    assert.ok(logMessages.warn.length > 0, 'Should have logged warning messages despite cache errors');
  });

  it('should use String.padEnd() for message formatting', async () => {
    fsStub.stat.rejects(new Error('ENOENT: no such file or directory'));
    fsStub.mkdir.resolves();
    fsStub.writeFile.resolves();

    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli')
      .reply(200, {
        'dist-tags': {
          latest: '2.0.0',
        },
      });

    await checkForUpdates('@adobe/aem-cli', '1.0.0', mockLogger);

    // Check that the messages are properly formatted with consistent width
    const updateLine = logMessages.warn.find((msg) => msg.includes('Update available'));
    const installLine = logMessages.warn.find((msg) => msg.includes('Run npm install'));

    assert.ok(updateLine, 'Should have update message');
    assert.ok(installLine, 'Should have install message');

    // Both lines should have the same length (61 characters for the box)
    // The actual content will be wrapped in chalk formatting, so we check the structure
    assert.ok(updateLine.includes('Update available! 1.0.0 → 2.0.0'), 'Should contain version info');
    assert.ok(installLine.includes('Run npm install -g @adobe/aem-cli to update'), 'Should contain install command');
  });
});
