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
process.env.HELIX_FETCH_FORCE_HTTP1 = 'true';

const assert = require('assert');
const path = require('path');
const fse = require('fs-extra');
const nock = require('nock');

const {
  initGit,
  assertHttp,
  assertHttpDom,
  createTestRoot,
} = require('./utils.js');

const UpCommand = require('../src/up.cmd');

const TEST_DIR = path.resolve('test/integration-helix-pages');

describe('Integration test for up command with helix pages', function suite() {
  this.timeout(60000); // ensure enough time for installing modules on slow machines
  let testDir;
  let buildDir;
  let testRoot;
  let helixPagesRepo;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'project');
    buildDir = path.resolve(testDir, '.hlx/build');
    helixPagesRepo = path.resolve(testRoot, 'helix-pages');
    await fse.copy(TEST_DIR, testDir);

    // init helix-pages fake local repo. we do this, because we don't want git checkouts in
    // the helix-cli repository, and we want to keep the tests offline
    await fse.copy(path.resolve(__dirname, 'fixtures', 'helix-pages', 'master'), helixPagesRepo);
    initGit(helixPagesRepo, 'https://github.com/adobe/helix-pages.git');

    nock.restore();
    nock.cleanAll();
    nock.activate();
  });

  afterEach(async () => {
    await fse.remove(testRoot);
  });

  it('up command delivers correct response.', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    let error = null;
    const cmd = new UpCommand()
      .withLiveReload(false)
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withPagesProxy(false)
      .withHelixPagesRepo(helixPagesRepo)
      .withCustomPipeline(process.env.HLX_CUSTOM_PIPELINE)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    cmd
      .on('started', async () => {
        try {
          await assertHttpDom(`http://localhost:${cmd.project.server.port}/index.html`, 200, 'pages_response.html');
          await assertHttp(`http://localhost:${cmd.project.server.port}/style.css`, 200, path.resolve(helixPagesRepo, 'htdocs', 'style.css'));
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

  it('up command delivers correct response from different branch.', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git', 'test-branch');

    const scope = nock('https://test-branch--dummy-foo--adobe.hlx.page')
      .get('/document.md')
      .reply(200, '## Welcome');

    let error = null;
    const cmd = new UpCommand()
      .withLiveReload(false)
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withPagesProxy(false)
      .withHelixPagesRepo(helixPagesRepo)
      .withCustomPipeline(process.env.HLX_CUSTOM_PIPELINE)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    cmd
      .on('started', async () => {
        try {
          await assertHttpDom(`http://localhost:${cmd.project.server.port}/document.html`, 200, 'pages_response_fstab.html');
          await scope.done();
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

  it('up command delivers correct response with pages proxy mode.', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    let error = null;
    const cmd = new UpCommand()
      .withLiveReload(false)
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    const scope = nock('https://master--dummy-foo--adobe.hlx.page')
      .get('/index.html')
      .reply(200, '## Welcome')
      .get('/not-found.txt')
      .reply(404);

    cmd
      .on('started', async () => {
        try {
          let ret = await assertHttp(`http://localhost:${cmd.project.server.port}/index.html`, 200);
          assert.strictEqual(ret.trim(), '## Welcome');
          ret = await assertHttp(`http://localhost:${cmd.project.server.port}/local.txt`, 200);
          assert.strictEqual(ret.trim(), 'Hello, world.');
          await assertHttp(`http://localhost:${cmd.project.server.port}/not-found.txt`, 404);
          await scope.done();
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
