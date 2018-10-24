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
const { createTestRoot, assertFile } = require('./utils.js');

const BuildCommand = require('../src/build.cmd');

const TEST_DIR = path.resolve('test/integration');

describe('Integration test for build', () => {
  let testRoot;
  let buildDir;
  let distDir;

  beforeEach(async function before() {
    // copying 300 MB can take a while
    this.timeout(20000);

    testRoot = await createTestRoot();
    buildDir = path.resolve(testRoot, '.hlx/build');
    distDir = path.resolve(testRoot, 'dist');
    await fs.copy(TEST_DIR, testRoot);
    return true;
  });

  it('build command succeeds and produces files', async function test() {
    this.timeout(5000);
    await new BuildCommand()
      .withFiles(['test/integration/src/**/*.htl'])
      .withTargetDir(buildDir)
      .withDistDir(distDir)
      .withCacheEnabled(false)
      .run();

    assertFile(path.resolve(buildDir, 'html.js'));
    assertFile(path.resolve(buildDir, 'html.pre.js'), true);
    assertFile(path.resolve(buildDir, 'example_html.js'));
    assertFile(path.resolve(buildDir, 'component', 'html.js'));
    assertFile(path.resolve(distDir, 'welcome.bc53b44e.txt'));
    assertFile(path.resolve(distDir, 'styles.28756636.css'));
    assertFile(path.resolve(testRoot, 'webroot', 'img', 'banner.png'));

    // test if manifest contains correct entries
    const manifest = fs.readJsonSync(path.resolve(buildDir, 'manifest.json'));
    assert.deepStrictEqual({
      'styles.28756636.css': {
        hash: '52a3333296aaf35a6761cf3f5309528e',
        size: 656,
      },
      'welcome.bc53b44e.txt': {
        hash: 'd6fc0d7dfc73e69219b8a3d110b69cb0',
        size: 24,
      },
    }, manifest);
  });

  it('build command with webroot puts files to correct place', async function test() {
    this.timeout(5000);
    await new BuildCommand()
      .withFiles(['test/integration/src/**/*.htl'])
      .withTargetDir(buildDir)
      .withCacheEnabled(false)
      .withDirectory(testRoot)
      .withConfigFile('test/fixtures/alt_webroot.yaml')
      .run();

    distDir = path.resolve(testRoot, 'webroot/dist');
    assertFile(path.resolve(buildDir, 'html.js'));
    assertFile(path.resolve(buildDir, 'html.pre.js'), true);
    assertFile(path.resolve(buildDir, 'example_html.js'));
    assertFile(path.resolve(buildDir, 'component', 'html.js'));
    assertFile(path.resolve(distDir, 'welcome.bc53b44e.txt'));
    assertFile(path.resolve(distDir, 'styles.28756636.css'));
    assertFile(path.resolve(testRoot, 'webroot', 'img', 'banner.png'));

    // test if manifest contains correct entries
    const manifest = fs.readJsonSync(path.resolve(buildDir, 'manifest.json'));
    assert.deepStrictEqual({
      'styles.28756636.css': {
        hash: '52a3333296aaf35a6761cf3f5309528e',
        size: 656,
      },
      'vendor/example.css': {
        hash: 'f9806776872f8ff4940b806f94923c4d',
        size: 658,
      },
      'welcome.bc53b44e.txt': {
        hash: 'd6fc0d7dfc73e69219b8a3d110b69cb0',
        size: 24,
      },
    }, manifest);
  });
});
