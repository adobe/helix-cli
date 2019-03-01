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
const fse = require('fs-extra');
const GitUtils = require('../src/git-utils');
const DemoCommand = require('../src/demo.cmd');

const TEST_DIR = path.resolve(__dirname, 'tmp');
const PROJECT_NAME = 'pulvillar-pantograph';
const pwd = process.cwd();

describe('Test Deployment in Empty Project', () => {
  beforeEach('Initialize test project', function bef(done) {
    this.timeout(5000);

    new DemoCommand()
      .withDirectory(TEST_DIR)
      .withName(PROJECT_NAME)
      .run()
      .then(() => {
        process.chdir(path.resolve(TEST_DIR, PROJECT_NAME));
        done();
      })
      .catch((e) => {
        done(e);
      });
  });

  it('Get function name', async () => {
    // eslint-disable-next-line global-require
    assert.notEqual('', await GitUtils.getRepository(process.cwd()));
    assert.equal('local--pulvillar-pantograph', await GitUtils.getRepository(process.cwd()));
  });

  afterEach('Reset working directory', function after() {
    this.timeout(15000);
    process.chdir(pwd);
    fse.removeSync(TEST_DIR);
  });
});
