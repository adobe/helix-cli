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

/* global describe, it, beforeEach, after */
/* eslint-disable no-unused-expressions */
const path = require('path');
const fse = require('fs-extra');
const {
  assert,
  expect,
  file,
  initGit,
  assertHttp,
} = require('./utils.js');

const UpCommand = require('../src/up.cmd');

const TEST_DIR = path.resolve('test/integration');

const BUILD_DIR = path.resolve(TEST_DIR, '.hlx/build');

const BUILD_DIR_ALT = path.resolve(TEST_DIR, 'tmp/build');

describe('Integration test for up command', () => {
  after(() => {
    fse.removeSync(path.resolve(TEST_DIR, '.git'));
  });

  beforeEach(() => {
    fse.removeSync(BUILD_DIR);
    fse.removeSync(BUILD_DIR_ALT);
  });

  it('up command fails outside git repository', (done) => {
    new UpCommand()
      .withCacheEnabled(false)
      .withFiles([path.join(TEST_DIR, 'src', '*.htl')])
      .withTargetDir(BUILD_DIR)
      .withDirectory(TEST_DIR)
      .run()
      .then(() => assert.fail('hlx up without .git should fail.'))
      .catch((err) => {
        assert.equal(err.message, 'Unable to start helix: Local README.md or index.md must be inside a valid git repository.');
        done();
      })
      .catch(done);
  });

  it('up command succeeds and can be stopped', (done) => {
    initGit(TEST_DIR);
    new UpCommand()
      .withCacheEnabled(false)
      .withFiles([path.join(TEST_DIR, 'src', '*.htl')])
      .withTargetDir(BUILD_DIR)
      .withDirectory(TEST_DIR)
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
    initGit(TEST_DIR);
    let error = null;
    const cmd = new UpCommand()
      .withCacheEnabled(false)
      .withFiles([path.join(TEST_DIR, 'src', '*.htl')])
      .withTargetDir(BUILD_DIR)
      .withDirectory(TEST_DIR)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    cmd
      .on('started', async () => {
        try {
          await assertHttp(`http://localhost:${cmd.project.server.port}`, '/index.html', 200, 'simple_response.html');
          await assertHttp(`http://localhost:${cmd.project.server.port}`, '/dist/welcome.txt', 200, 'welcome_response.txt');
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

  it('up command delivers correct response with different build dir.', (done) => {
    initGit(TEST_DIR);
    let error = null;
    const cmd = new UpCommand()
      .withCacheEnabled(false)
      .withFiles([path.join(TEST_DIR, 'src', '*.htl')])
      .withTargetDir(BUILD_DIR_ALT)
      .withDirectory(TEST_DIR)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    cmd
      .on('started', async () => {
        try {
          expect(file(path.resolve(BUILD_DIR_ALT, 'html.js'))).to.exist;
          await assertHttp(`http://localhost:${cmd.project.server.port}`, '/index.html', 200, 'simple_response.html');
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

  it('up command detected modified sources and delivers correct response.');
});
