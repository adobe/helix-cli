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
const http = require('http');
const Replay = require('replay');
// disable replay for this test
Replay.mode = 'bloody';

const UpCommand = require('../src/up.cmd');

const TEST_DIR = path.resolve('test/integration');

const BUILD_DIR = path.resolve(TEST_DIR, '.hlx/build');

const BUILD_DIR_ALT = path.resolve(TEST_DIR, 'tmp/build');

/**
 * init git in integration so that petridish can run
 */
function initGit() {
  const pwd = shell.pwd();
  shell.cd(TEST_DIR);
  shell.exec('git init');
  shell.exec('git add -A');
  shell.exec('git commit -m"initial commit."');
  shell.cd(pwd);
}

// todo: use polly.js ?
async function assertHttp(url, status, spec) {
  return new Promise((resolve, reject) => {
    const expected = fse.readFileSync(path.resolve(__dirname, 'specs', spec)).toString();
    let data = '';
    http.get(url, (res) => {
      try {
        assert.equal(res.statusCode, status);
      } catch (e) {
        res.resume();
        reject(e);
      }

      res
        .on('data', (chunk) => {
          data += chunk;
        })
        .on('end', () => {
          try {
            assert.equal(data, expected);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
    }).on('error', (e) => {
      reject(e);
    });
  });
}

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
    initGit();
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
    initGit();
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
          await assertHttp(`http://localhost:${cmd.project.server.port}/index.html`, 200, 'simple_response.html');
          await assertHttp(`http://localhost:${cmd.project.server.port}/dist/welcome.txt`, 200, 'welcome_response.txt');
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
    initGit();
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
          const exists = await fse.pathExistsSync(path.resolve(BUILD_DIR_ALT, 'html.js'));
          assert.ok(exists, 'compiled html.js');
          await assertHttp(`http://localhost:${cmd.project.server.port}/index.html`, 200, 'simple_response.html');
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
