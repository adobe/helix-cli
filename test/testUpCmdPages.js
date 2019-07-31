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
const path = require('path');
const fse = require('fs-extra');

const {
  initGit,
  assertHttp,
  assertHttpDom,
  createTestRoot,
} = require('./utils.js');

const UpCommand = require('../src/up.cmd');

const TEST_DIR = path.resolve('test/integration-helix-pages');

describe('Integration test for up command with helix pages', function suite() {
  this.timeout(20000);
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
  });

  afterEach(async () => {
    await fse.remove(testRoot);
  });

  it('up command delivers correct response.', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    let error = null;
    const cmd = new UpCommand()
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withHelixPagesRepo(helixPagesRepo)
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
});
