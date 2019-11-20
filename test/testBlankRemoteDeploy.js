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
const { createTestRoot } = require('./utils.js');
const DemoCommand = require('../src/demo.cmd');

const PROJECT_NAME = 'pulvillar-pantograph';

describe('Test Deployment in Empty Project', () => {
  let testRoot;

  beforeEach('Initialize test project', async () => {
    testRoot = await createTestRoot();
    await new DemoCommand()
      .withDirectory(testRoot)
      .withName(PROJECT_NAME)
      .run();
  });

  it('Get function name', async () => {
    // eslint-disable-next-line global-require
    const project = path.resolve(testRoot, PROJECT_NAME);
    assert.equal(await GitUtils.getRepository(project), 'local--pulvillar-pantograph');
  });

  afterEach('Reset working directory', async () => {
    await fse.remove(testRoot);
  });
});
