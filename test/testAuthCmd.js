/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-disable no-console, no-underscore-dangle */
/* eslint-env mocha */

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const stream = require('stream');
const fs = require('fs-extra');
const nock = require('nock');
const rp = require('request-promise-native');
const AuthCommand = require('../src/auth.cmd');

const {
  assertFile,
  createTestRoot,
} = require('./utils.js');


class TestStream extends stream.Writable {
  constructor() {
    super();
    this.data = '';
  }

  _write(chunk, enc, next) {
    console.log(chunk.toString());
    this.data += chunk.toString();
    next();
  }
}


describe('Integration test for auth', () => {
  let testRoot;

  beforeEach(async () => {
    testRoot = await createTestRoot();

    // reset nock. potential conflict with replay
    nock.restore();
    nock.cleanAll();
    nock.activate();
  });

  afterEach(() => {
    nock.restore();
    nock.cleanAll();
  });

  it('auth fails if console is no tty', async () => {
    try {
      const cmd = new AuthCommand()
        .withDirectory(testRoot);
      cmd._stdout = new TestStream();
      await cmd.run();
      assert.fail('auth should fail on no tty');
    } catch (e) {
      assert.equal(e.message, 'Interactive authentication tool not supported on non interactive consoles.');
    }
  });

  it('auth create an .env file with the token', async () => {
    const githubApi = nock('https://api.github.com')
      .get('/user')
      .reply(200, JSON.stringify({
        name: 'Mr Black',
        login: 'test-agent',
      }));

    const out = new TestStream();
    out.isTTY = true;
    const token = crypto.randomBytes(16).toString('hex');
    const cmd = new AuthCommand()
      .withDirectory(testRoot)
      .withOpenBrowser(false)
      .on('server-start', async (port) => {
        await rp({
          method: 'POST',
          uri: `http://127.0.0.1:${port}/`,
          body: {
            token,
          },
          json: true,
        });
      });

    cmd._stdin = new stream.PassThrough();
    cmd._stdout = out;
    cmd._askAdd = 'yes';
    cmd._askFile = '.foo';

    await cmd.run();

    githubApi.done();

    const file = await fs.readFile(path.resolve(testRoot, '.foo'), 'utf-8');
    const tokenLine = `HLX_GITHUB_TOKEN=${token}\n`;
    assert.ok(out.data.indexOf('Mr Black') > 0);
    assert.ok(out.data.indexOf('test-agent') > 0);
    assert.ok(out.data.indexOf(tokenLine) < 0);
    assert.equal(file, tokenLine);
  });

  it('auth reports the token', async () => {
    const githubApi = nock('https://api.github.com')
      .get('/user')
      .reply(200, JSON.stringify({
        name: 'Mr Black',
        login: 'test-agent',
      }));

    const out = new TestStream();
    out.isTTY = true;
    const token = crypto.randomBytes(16).toString('hex');
    const cmd = new AuthCommand()
      .withDirectory(testRoot)
      .withOpenBrowser(false)
      .on('server-start', async (port) => {
        await rp({
          method: 'POST',
          uri: `http://127.0.0.1:${port}/`,
          body: {
            token,
          },
          json: true,
        });
      });

    cmd._stdin = new stream.PassThrough();
    cmd._stdout = out;
    cmd._askAdd = 'no';
    cmd._askFile = '.foo';

    await cmd.run();

    githubApi.done();

    assertFile(path.resolve(testRoot, '.foo'), true);
    const tokenLine = `HLX_GITHUB_TOKEN=${token}`;
    assert.ok(out.data.indexOf('Mr Black') > 0);
    assert.ok(out.data.indexOf('test-agent') > 0);
    assert.ok(out.data.indexOf(tokenLine) > 0);
  });
});
