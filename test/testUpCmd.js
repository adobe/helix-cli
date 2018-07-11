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

const assert = require('assert');
const path = require('path');
const shell = require('shelljs');
const fse = require('fs-extra');

const UpCommand = require('../src/up.cmd');

const TEST_DIR = path.resolve('test/integration');

const BUILD_DIR = path.resolve(TEST_DIR, '.hlx/build');

const BUILD_DIR_ALT = path.resolve(TEST_DIR, 'tmp/');

/**
 * init git in integration so that petridish can run
 */
function initGit() {
  shell.cd(TEST_DIR);
  shell.exec('git init');
  shell.exec('git add -A');
  shell.exec('git commit -m"initial commit."');
}

describe('Integration test for build', () => {
  after(() => {
    fse.removeSync(path.resolve(TEST_DIR, '.git'));
  });

  beforeEach(() => {
    fse.removeSync(BUILD_DIR);
    fse.removeSync(BUILD_DIR_ALT);
  });

  it('up command fails outside git repository', (done) => {
    new UpCommand()
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

  // TODO: implement after git-server.stop() has been implemented. otherwise the project.stop()
  // TODO: below will not complete
  it.skip('up command succeeds and can be stopped', (done) => {
    initGit();
    new UpCommand()
      .withFiles([path.join(TEST_DIR, 'src', '*.htl')])
      .withTargetDir(BUILD_DIR)
      .withDirectory(TEST_DIR)
      .withHttpPort(0)
      .on('started', (cmd) => {
        // eslint-disable-next-line no-console
        console.log(`test server running on port ${cmd.project.server.port}`);
        // todo: issue http request and check result (polly.js) ?
        cmd.stop();
      })
      .on('stopped', () => {
        done();
      })
      .run()
      .then(() => done())
      .catch(done);
  });

  it('up command delivers correct response.');
  it('up command delivers correct response with different build dir.');
  it('up command detected modified sources and delivers correct response.');
});
