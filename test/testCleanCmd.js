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

const path = require('path');
const fs = require('fs-extra');
const assert = require('assert');
const sinon = require('sinon');

const {
  createTestRoot,
  createFakeTestRoot,
  assertFile,
} = require('./utils.js');

const CleanCommand = require('../src/clean.cmd');

const TEST_DIR = path.resolve('test/integration');

describe('Integration test for clean', () => {
  let testRoot;
  let buildDir;
  let cacheDir;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    buildDir = path.resolve(testRoot, '.hlx/build');
    cacheDir = path.resolve(testRoot, '.hlx/cache');
    await fs.copy(TEST_DIR, testRoot);
    return true;
  });

  it('clean command succeeds and removes files', async () => {
    // add some files to the directories
    const testFile1 = path.resolve(buildDir, 'html.htl');
    const testFile2 = path.resolve(cacheDir, 'html.htl');
    await fs.copy(path.resolve(testRoot, 'src', 'html.htl'), testFile1);
    await fs.copy(path.resolve(testRoot, 'src', 'html.htl'), testFile2);
    assertFile(testFile1);
    assertFile(testFile2);

    await new CleanCommand()
      .withDirectory(testRoot)
      .withTargetDir(buildDir)
      .run();

    assertFile(testFile1, true);
    assertFile(testFile2, true);
  });

  it('clean command fails gracefully if directory does not exist', async () => {
    const fakeTestRoot = await createFakeTestRoot();
    const fakeBuildDir = path.resolve(fakeTestRoot, '.hlx/build');

    await new CleanCommand()
      .withDirectory(fakeTestRoot)
      .withTargetDir(fakeBuildDir)
      .run();
  });

  it('clean command uses default target dir if none specified', async () => {
    // add some files to the directories
    const testFile1 = path.resolve(buildDir, 'html.htl');
    await fs.copy(path.resolve(testRoot, 'src', 'html.htl'), testFile1);
    assertFile(testFile1);

    await new CleanCommand()
      .withDirectory(testRoot)
      .run();

    assertFile(testFile1, true);
  });

  it('clean command logs and catches error if deletion fails', async () => {
    const testFile1 = path.resolve(buildDir, 'html.htl');
    await fs.copy(path.resolve(testRoot, 'src', 'html.htl'), testFile1);
    const stub = sinon.stub(fs, 'remove')
      .throws(new Error('oops'));
    assert.doesNotThrow(async () => {
      await new CleanCommand()
        .withDirectory(testRoot)
        .withTargetDir(buildDir)
        .run();
      stub.restore();
    });
  });
});
