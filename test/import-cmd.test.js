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

/* eslint-env mocha */
import assert from 'assert';
import path from 'path';
import fse from 'fs-extra';
import nock from 'nock';
import { assertHttp, createTestRoot } from './utils.js';
import { fetch } from '../src/fetch-utils.js';
import ImportCommand from '../src/import.cmd.js';

const TEST_DIR = path.resolve(__rootdir, 'test', 'fixtures', 'import');
const SAMPLE_HOST = 'https://www.sample.com';

describe('Integration test for import command', function suite() {
  this.timeout(60000);

  it('import command delivers correct response.', (done) => {
    let error = null;
    const cmd = new ImportCommand()
      .withDirectory(TEST_DIR)
      .withOpen(false)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    const scope = nock(SAMPLE_HOST)
      .get('/index.html')
      .reply(200, 'Hello world')
      .get('/index.html')
      .reply(200, 'Hello world')
      .get('/not-found.txt')
      .reply(404);

    cmd
      .on('started', async () => {
        try {
          // test proxy
          await assertHttp(`http://localhost:${cmd.project.server.port}/index.html`, 403);
          let resp = await fetch(`http://localhost:${cmd.project.server.port}/index.html?host=${SAMPLE_HOST}`);
          assert.strictEqual(resp.status, 200);
          let text = await resp.text();
          assert.strictEqual(text.trim(), 'Hello world');
          const cookies = resp.headers.get('set-cookie');
          assert.ok(cookies);

          // "host" cookie has been set and host query param is not required anymore
          resp = await fetch(`http://localhost:${cmd.project.server.port}/index.html`, {
            headers: {
              cookie: cookies,
            },
          });
          assert.strictEqual(resp.status, 200);
          text = await resp.text();
          assert.strictEqual(text.trim(), 'Hello world');

          resp = await fetch(`http://localhost:${cmd.project.server.port}/not-found.txt`, {
            headers: {
              cookie: cookies,
            },
          });
          assert.strictEqual(resp.status, 404);

          await scope.done();

          // /tools is delivered for local project folder
          const js = await assertHttp(`http://localhost:${cmd.project.server.port}/tools/importer/import.js`, 200);
          assert.strictEqual(js.trim(), '// import.js code');
          myDone();
        } catch (e) {
          myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });
});

describe('Integration test for import command with cache', function suite() {
  this.timeout(60000); // ensure enough time for installing modules on slow machines
  let testDir;
  let testRoot;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'import');
    await fse.copy(TEST_DIR, testDir);
  });

  afterEach(async () => {
    await fse.remove(testRoot);
  });

  it('up command delivers correct cached response.', (done) => {
    let error = null;
    const cmd = new ImportCommand()
      .withDirectory(testDir)
      .withOpen(false)
      .withHttpPort(0)
      .withCache(path.resolve(testRoot, '.cache'));

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    const content = {
      index: '## Welcome',
      page1: '## Some page with qs',
      page2: '## Some different content for different qs',
      plain: 'Some plain content',
    };

    const scope = nock(SAMPLE_HOST)
      .get('/index.html')
      .reply(200, content.index)
      .get('/folder/page.html?foo=bar&baz=qux')
      .reply(200, content.page1)
      .get('/folder/page.html?foo=bar&baz=othervalue')
      .reply(200, content.page2)
      .get('/not-found.txt')
      .reply(404)
      .get('/page.plain.html')
      .reply(200, content.plain, { 'Content-Type': 'text/html' });

    cmd
      .on('started', async () => {
        try {
          const assertRequests = async () => {
            let ret = await assertHttp(`http://localhost:${cmd.project.server.port}/index.html?host=${SAMPLE_HOST}`, 200);
            assert.strictEqual(ret.trim(), content.index);
            ret = await assertHttp(`http://localhost:${cmd.project.server.port}/?host=${SAMPLE_HOST}`, 200);
            assert.strictEqual(ret.trim(), content.index);
            ret = await assertHttp(`http://localhost:${cmd.project.server.port}/folder/page.html?foo=bar&baz=qux&host=${SAMPLE_HOST}`, 200);
            assert.strictEqual(ret.trim(), content.page1);
            ret = await assertHttp(`http://localhost:${cmd.project.server.port}/folder/page.html?foo=bar&baz=othervalue&host=${SAMPLE_HOST}`, 200);
            assert.strictEqual(ret.trim(), content.page2);
            await assertHttp(`http://localhost:${cmd.project.server.port}/not-found.txt?host=${SAMPLE_HOST}`, 404);
            ret = await assertHttp(`http://localhost:${cmd.project.server.port}/page.plain.html?host=${SAMPLE_HOST}`, 200);
            assert.strictEqual(ret.trim(), content.plain);

            const js = await assertHttp(`http://localhost:${cmd.project.server.port}/tools/importer/import.js`, 200);
            assert.strictEqual(js.trim(), '// import.js code');
          };

          await assertRequests();

          await scope.done();

          // re-running the same requests with nock scopes "done" should still work
          // because content will be served from the cache or from local file
          await assertRequests();

          myDone();
        } catch (e) {
          myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });
});
