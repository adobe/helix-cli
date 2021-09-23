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
const assert = require('assert');
const path = require('path');
const fse = require('fs-extra');
const nock = require('nock');

const {
  initGit,
  assertHttp,
  createTestRoot,
} = require('./utils.js');

const UpCommand = require('../src/up.cmd');

const TEST_DIR = path.resolve(__dirname, 'fixtures', 'project');

describe('Integration test for up command with helix pages', function suite() {
  this.timeout(60000); // ensure enough time for installing modules on slow machines
  let testDir;
  let testRoot;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'project');
    await fse.copy(TEST_DIR, testDir);
  });

  afterEach(async () => {
    await fse.remove(testRoot);
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

    const scope = nock('https://master--dummy-foo--adobe.hlx3.page')
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
