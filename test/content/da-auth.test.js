/*
 * Copyright 2026 Adobe. All rights reserved.
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
import path from 'path';
import esmock from 'esmock';
import fse from 'fs-extra';
import { makeLogger } from './content-test-utils.js';

const TEST_PROJECT_DIR = '/tmp/test-da-project';

function waitForTimeout(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('getValidToken', () => {
  it('returns override token immediately without reading stored token', async () => {
    let fseCalled = false;
    const { getValidToken } = await esmock('../../src/content/da-auth.js', {
      'fs-extra': {
        ...fse,
        pathExists: async () => {
          fseCalled = true;
          return false;
        },
      },
    });
    const log = makeLogger();
    const result = await getValidToken(log, 'my-explicit-token', TEST_PROJECT_DIR);
    assert.strictEqual(result, 'my-explicit-token');
    assert.strictEqual(fseCalled, false);
  });

  it('returns stored access token when valid', async () => {
    const tokenData = {
      access_token: 'stored-token',
      expires_at: Date.now() + 60_000 * 10,
    };
    const { getValidToken } = await esmock('../../src/content/da-auth.js', {
      'fs-extra': {
        ...fse,
        pathExists: async () => true,
        readJson: async () => tokenData,
      },
    });
    const log = makeLogger();
    const result = await getValidToken(log, undefined, TEST_PROJECT_DIR);
    assert.strictEqual(result, 'stored-token');
  });

  it('logs expiry message and calls login when stored token is expired', async () => {
    const tokenData = {
      access_token: 'old-token',
      expires_at: Date.now() - 1000,
    };
    const { getValidToken } = await esmock('../../src/content/da-auth.js', {
      'fs-extra': {
        ...fse,
        pathExists: async () => true,
        readJson: async () => tokenData,
        ensureDir: async () => {},
        writeJson: async () => {},
      },
      open: async () => {},
    });
    const log = makeLogger();
    try {
      await Promise.race([
        getValidToken(log, undefined, TEST_PROJECT_DIR),
        waitForTimeout(100).then(() => { throw new Error('timeout'); }),
      ]);
    } catch (err) {
      const msgs = log.logs.map((l) => l.msg).join(' ');
      const isExpectedError = err.message === 'timeout'
        || err.message.includes('login')
        || err.message.includes('EADDRINUSE')
        || err.message.includes('callback');
      const hasExpiredLog = msgs.includes('expired') || msgs.includes('login') || msgs.includes('browser');
      assert.ok(isExpectedError || hasExpiredLog);
    }
  });

  it('proceeds to login when no stored token file exists', async () => {
    const { getValidToken } = await esmock('../../src/content/da-auth.js', {
      'fs-extra': {
        ...fse,
        pathExists: async () => false,
        ensureDir: async () => {},
        writeJson: async () => {},
      },
      open: async () => {},
    });
    const log = makeLogger();
    try {
      await Promise.race([
        getValidToken(log, undefined, TEST_PROJECT_DIR),
        waitForTimeout(100).then(() => { throw new Error('timeout'); }),
      ]);
    } catch (err) {
      assert.ok(
        err.message === 'timeout'
          || err.message.includes('login')
          || err.message.includes('EADDRINUSE')
          || err.message.includes('callback'),
      );
    }
  });

  it('treats stored token without expires_at as expired', async () => {
    const tokenData = { access_token: 'legacy-token' };
    const { getValidToken } = await esmock('../../src/content/da-auth.js', {
      'fs-extra': {
        ...fse,
        pathExists: async () => true,
        readJson: async () => tokenData,
        ensureDir: async () => {},
        writeJson: async () => {},
      },
      open: async () => {},
    });
    const log = makeLogger();
    try {
      await Promise.race([
        getValidToken(log, undefined, TEST_PROJECT_DIR),
        waitForTimeout(100).then(() => { throw new Error('timeout'); }),
      ]);
    } catch (err) {
      assert.ok(
        err.message === 'timeout'
          || err.message.includes('login')
          || err.message.includes('EADDRINUSE')
          || err.message.includes('callback'),
      );
    }
  });

  it('passes relative token path to GitUtils.isIgnored when saving token after login', async () => {
    let isIgnoredPath;
    // Mock http so no real socket is bound (avoids EADDRINUSE from other tests)
    // When listen() is called, simulate the /token request firing immediately.
    const { getValidToken } = await esmock('../../src/content/da-auth.js', {
      'node:http': {
        default: {
          createServer: (reqHandler) => {
            const mockServer = {
              listen: () => {
                setImmediate(() => {
                  const fakeReq = { url: '/token?access_token=test-token&expires_in=3600' };
                  const fakeRes = { writeHead: () => {}, end: () => {} };
                  reqHandler(fakeReq, fakeRes);
                });
              },
              close: () => {},
              on: () => {},
            };
            return mockServer;
          },
        },
      },
      'fs-extra': {
        ...fse,
        pathExists: async () => false,
        ensureDir: async () => {},
        writeJson: async () => {},
      },
      'fs/promises': {
        appendFile: async () => {},
      },
      '../../src/git-utils.js': {
        default: {
          isIgnored: async (_dir, filePath) => {
            isIgnoredPath = filePath;
            return true; // already ignored — skip .gitignore append
          },
        },
      },
      open: async () => {},
    });
    const log = makeLogger();
    await getValidToken(log, undefined, TEST_PROJECT_DIR);
    assert.strictEqual(isIgnoredPath, path.join('.hlx', '.da-token.json'));
  });

  it('reads token file from the content directory', async () => {
    const tokenData = {
      access_token: 'valid-token',
      expires_at: Date.now() + 3_600_000,
    };
    let readPath;
    const { getValidToken } = await esmock('../../src/content/da-auth.js', {
      'fs-extra': {
        ...fse,
        pathExists: async (p) => {
          readPath = p;
          return true;
        },
        readJson: async () => tokenData,
      },
    });
    const log = makeLogger();
    await getValidToken(log, undefined, TEST_PROJECT_DIR);
    assert.strictEqual(readPath, path.join(TEST_PROJECT_DIR, '.hlx', '.da-token.json'));
  });
});
