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
const { createTestRoot } = require('./utils.js');

const BuildCommand = require('../src/build.cmd');

const TEST_DIR = path.resolve('test/integration');

describe('Integration test for build', () => {

  let testDir;
  let buildDir;
  let distDir;
  let srcDir;

  beforeEach(async () => {
    const testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'project');
    buildDir = path.resolve(testRoot, '.hlx/build');
    distDir = path.resolve(testRoot, '.hlx/dist');
    srcDir = path.resolve(testDir, 'src');
    await fs.copy(TEST_DIR, testDir);
  });

  it('build command succeeds and produces files', async () => {
    await new BuildCommand()
      .withFiles(['test/integration/src/**/*.htl'])
      .withTargetDir(buildDir)
      .withStaticDir(srcDir)
      .withCacheEnabled(false)
      .run();

    assert.ok(fs.existsSync(path.resolve(buildDir, 'html.js')));
    assert.ok(!fs.existsSync(path.resolve(buildDir, 'html.pre.js')));
    assert.ok(fs.existsSync(path.resolve(buildDir, 'example_html.js')));
    assert.ok(fs.existsSync(path.resolve(buildDir, 'component', 'html.js')));
    assert.ok(fs.existsSync(path.resolve(distDir, 'welcome.txt')));
    assert.ok(fs.existsSync(path.resolve(distDir, 'component', 'foo.txt')));
  }).timeout(5000);
});
