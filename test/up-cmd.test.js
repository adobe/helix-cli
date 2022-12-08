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
import {
  Nock, assertHttp, createTestRoot, initGit, switchBranch,
} from './utils.js';
import UpCommand from '../src/up.cmd.js';

const TEST_DIR = path.resolve(__rootdir, 'test', 'fixtures', 'project');

describe('Integration test for up command with helix pages', function suite() {
  this.timeout(60000); // ensure enough time for installing modules on slow machines
  let testDir;
  let testRoot;
  let nock;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'project');
    nock = new Nock();
    nock.enableNetConnect(/localhost/);
    await fse.copy(TEST_DIR, testDir);
  });

  afterEach(async () => {
    await fse.remove(testRoot);
    nock.done();
  });

  it('up command delivers correct response.', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    let error = null;
    const cmd = new UpCommand()
      .withLiveReload(false)
      .withDirectory(testDir)
      .withOpen(false)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    nock('https://master--dummy-foo--adobe.hlx.page')
      .get('/index.html')
      .reply(200, '## Welcome')
      .get('/not-found.txt')
      .reply(404)
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    nock('https://raw.githubusercontent.com')
      .get('/adobe/dummy-foo/master/fstab.yaml')
      .reply(200, 'dummy');

    cmd
      .on('started', async () => {
        try {
          let ret = await assertHttp(`http://localhost:${cmd.project.server.port}/index.html`, 200);
          assert.strictEqual(ret.trim(), '## Welcome');
          ret = await assertHttp(`http://localhost:${cmd.project.server.port}/local.txt`, 200);
          assert.strictEqual(ret.trim(), 'Hello, world.');
          await assertHttp(`http://localhost:${cmd.project.server.port}/not-found.txt`, 404);
          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });

  it('up command delivers correct response (branch with slash).', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git', 'tripod/test');
    let error = null;
    const cmd = new UpCommand()
      .withLiveReload(false)
      .withDirectory(testDir)
      .withOpen(false)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    nock('https://tripod-test--dummy-foo--adobe.hlx.page')
      .get('/index.html')
      .reply(200, '## Welcome')
      .get('/not-found.txt')
      .reply(404)
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');
    nock('https://raw.githubusercontent.com')
      .get('/adobe/dummy-foo/tripod/test/fstab.yaml')
      .reply(200, 'dummy');

    cmd
      .on('started', async () => {
        try {
          let ret = await assertHttp(`http://localhost:${cmd.project.server.port}/index.html`, 200);
          assert.strictEqual(ret.trim(), '## Welcome');
          ret = await assertHttp(`http://localhost:${cmd.project.server.port}/local.txt`, 200);
          assert.strictEqual(ret.trim(), 'Hello, world.');
          await assertHttp(`http://localhost:${cmd.project.server.port}/not-found.txt`, 404);
          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });

  it('up command switches to main branch if needed.', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    let error = null;
    const cmd = new UpCommand()
      .withLiveReload(false)
      .withDirectory(testDir)
      .withOpen(false)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    nock('https://main--dummy-foo--adobe.hlx.page')
      .get('/index.html')
      .reply(200, '## Welcome')
      .get('/not-found.txt')
      .reply(404)
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    nock('https://raw.githubusercontent.com')
      .get('/adobe/dummy-foo/master/fstab.yaml')
      .reply(404, 'dummy');

    cmd
      .on('started', async () => {
        try {
          let ret = await assertHttp(`http://localhost:${cmd.project.server.port}/index.html`, 200);
          assert.strictEqual(ret.trim(), '## Welcome');
          ret = await assertHttp(`http://localhost:${cmd.project.server.port}/local.txt`, 200);
          assert.strictEqual(ret.trim(), 'Hello, world.');
          await assertHttp(`http://localhost:${cmd.project.server.port}/not-found.txt`, 404);
          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });

  it('up command reloads when git branch changes.', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    let error = null;
    const cmd = new UpCommand()
      .withLiveReload(false)
      .withDirectory(testDir)
      .withOpen(false)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    nock('https://main--dummy-foo--adobe.hlx.page')
      .get('/index.html')
      .reply(200, '## Welcome')
      .get('/not-found.txt')
      .reply(404)
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    nock('https://raw.githubusercontent.com')
      .get('/adobe/dummy-foo/master/fstab.yaml')
      .reply(404, 'dummy');

    nock('https://raw.githubusercontent.com')
      .get('/adobe/dummy-foo/new-branch/fstab.yaml')
      .reply(200, 'yep!');

    nock('https://new-branch--dummy-foo--adobe.hlx.page')
      .get('/head.html')
      .reply(200, '## Welcome');

    cmd
      .on('started', async () => {
        try {
          let ret = await assertHttp(`http://localhost:${cmd.project.server.port}/index.html`, 200);
          assert.strictEqual(ret.trim(), '## Welcome');
          ret = await assertHttp(`http://localhost:${cmd.project.server.port}/local.txt`, 200);
          assert.strictEqual(ret.trim(), 'Hello, world.');
          await assertHttp(`http://localhost:${cmd.project.server.port}/not-found.txt`, 404);
          // now switch to a new branch
          switchBranch(testDir, 'new-branch');
          // wait 1 second for the git branch to be detected
          await new Promise((resolve) => {
            setTimeout(resolve, 1000);
          });
          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });
});

describe('Integration test for up command with cache', function suite() {
  this.timeout(60000); // ensure enough time for installing modules on slow machines
  let testDir;
  let testRoot;
  let nock;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'project');
    await fse.copy(TEST_DIR, testDir);
    nock = new Nock();
  });

  afterEach(async () => {
    nock.done();
    await fse.remove(testRoot);
  });

  it('up command delivers correct cached response.', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    let error = null;
    const cmd = new UpCommand()
      .withLiveReload(false)
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
    nock('https://master--dummy-foo--adobe.hlx.page')
      .get('/index.html')
      .reply(200, content.index)
      .get('/folder/page.html?foo=bar&baz=qux')
      .reply(200, content.page1)
      .get('/folder/page.html?foo=bar&baz=othervalue')
      .reply(200, content.page2)
      .get('/not-found.txt')
      .reply(404)
      .get('/page.plain.html')
      .reply(200, content.plain, { 'Content-Type': 'text/html' })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    nock('https://raw.githubusercontent.com')
      .get('/adobe/dummy-foo/master/fstab.yaml')
      .reply(200, 'dummy');

    nock.enableNetConnect(/localhost/);

    cmd
      .on('started', async () => {
        try {
          const assertRequests = async () => {
            let ret = await assertHttp(`http://localhost:${cmd.project.server.port}/index.html`, 200);
            assert.strictEqual(ret.trim(), content.index);
            ret = await assertHttp(`http://localhost:${cmd.project.server.port}/`, 200);
            assert.strictEqual(ret.trim(), content.index);
            ret = await assertHttp(`http://localhost:${cmd.project.server.port}/folder/page.html?foo=bar&baz=qux`, 200);
            assert.strictEqual(ret.trim(), content.page1);
            ret = await assertHttp(`http://localhost:${cmd.project.server.port}/folder/page.html?foo=bar&baz=othervalue`, 200);
            assert.strictEqual(ret.trim(), content.page2);
            await assertHttp(`http://localhost:${cmd.project.server.port}/not-found.txt`, 404);
            ret = await assertHttp(`http://localhost:${cmd.project.server.port}/page.plain.html`, 200);
            assert.strictEqual(ret.trim(), content.plain);

            ret = await assertHttp(`http://localhost:${cmd.project.server.port}/local.txt`, 200);
            assert.strictEqual(ret.trim(), 'Hello, world.');
          };

          await assertRequests();

          // re-running the same requests with nock scopes "done" should still work
          // because content will be served from the cache or from local file
          await assertRequests();

          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });
});
