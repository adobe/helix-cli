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
/* eslint-disable no-unused-expressions */
const assert = require('assert');
const path = require('path');
const fse = require('fs-extra');
const winston = require('winston');

const {
  initGit,
  assertHttp,
  createTestRoot,
} = require('./utils.js');

const UpCommand = require('../src/up.cmd');

const TEST_DIR = path.resolve('test/integration');

describe('Integration test for up command', () => {
  let testDir;
  let buildDir;
  let webroot;

  beforeEach(async function before() {
    this.timeout(20000);
    const testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'project');
    buildDir = path.resolve(testRoot, '.hlx/build');
    webroot = path.resolve(testDir, 'webroot');
    await fse.copy(TEST_DIR, testDir);

    // reset the winston loggers
    winston.loggers.loggers.clear();
  });

  it('up command fails outside git repository', async () => {
    try {
      await new UpCommand()
        .withCacheEnabled(false)
        .withFiles([path.join(testDir, 'src', '*.htl'), path.join(testDir, 'src', '*.js')])
        .withTargetDir(buildDir)
        .withDirectory(testDir)
        .withStrainName('dev')
        .run();
      assert.fail('hlx up without .git should fail.');
    } catch (e) {
      assert.equal(e.message, 'Unable to start helix: Local README.md or index.md must be inside a valid git repository.');
    }
  });

  it('up command succeeds and can be stopped', (done) => {
    initGit(testDir);
    new UpCommand()
      .withCacheEnabled(false)
      .withFiles([path.join(testDir, 'src', '*.htl'), path.join(testDir, 'src', '*.js')])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withStrainName('dev')
      .withHttpPort(0)
      .on('started', (cmd) => {
        // eslint-disable-next-line no-console
        console.log(`test server running on port ${cmd.project.server.port}`);
        cmd.stop();
      })
      .on('stopped', () => {
        done();
      })
      .run()
      .catch(done);
  }).timeout(5000);

  it('up command delivers correct response.', (done) => {
    initGit(testDir);
    let error = null;
    const cmd = new UpCommand()
      .withCacheEnabled(false)
      .withFiles([path.join(testDir, 'src', '*.htl'), path.join(testDir, 'src', '*.js')])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withWebRoot(webroot)
      .withStrainName('dev')
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    cmd
      .on('started', async () => {
        try {
          await assertHttp(`http://localhost:${cmd.project.server.port}/index.html`, 200, 'simple_response.html');
          await assertHttp(`http://localhost:${cmd.project.server.port}/welcome.txt`, 200, 'welcome_response.txt');
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
  }).timeout(5000);

  it('up command delivers modified sources and delivers correct response.', (done) => {
    // this test always hangs on the CI, probably due to the parcel workers. ignoring for now.
    const srcFile = path.resolve(testDir, 'src/html2.htl');
    const dstFile = path.resolve(testDir, 'src/html.htl');

    initGit(testDir);
    let error = null;
    const cmd = new UpCommand()
      .withCacheEnabled(false)
      .withFiles([path.join(testDir, 'src', '*.htl'), path.join(testDir, 'src', '*.js')])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withWebRoot(webroot)
      .withStrainName('dev')
      .withHttpPort(0);

    const myDone = async (err) => {
      error = err;
      return cmd.stop();
    };

    cmd
      .on('started', async () => {
        try {
          await assertHttp(`http://localhost:${cmd.project.server.port}/index.html`, 200, 'simple_response.html');
          await assertHttp(`http://localhost:${cmd.project.server.port}/welcome.txt`, 200, 'welcome_response.txt');
          await fse.copy(srcFile, dstFile);
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .on('build', async () => {
        try {
          await assertHttp(`http://localhost:${cmd.project.server.port}/index.html`, 200, 'simple_response2.html');
          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .run()
      .catch(done);
  }).timeout(10000);
});
