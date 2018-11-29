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
  let webroot;

  beforeEach(async function before() {
    // copying 300 MB can take a while
    this.timeout(20000);

    testRoot = await createTestRoot();
    buildDir = path.resolve(testRoot, '.hlx/build');
    webroot = path.resolve(testRoot, 'webroot');
    await fs.copy(TEST_DIR, testRoot);
    return true;
  });

  it('build command succeeds and produces files', async function test() {
    this.timeout(5000);
    await new BuildCommand()
      .withFiles(['test/integration/src/**/*.htl', 'test/integration/src/**/*.js'])
      .withTargetDir(buildDir)
      .withWebRoot(webroot)
      .withCacheEnabled(false)
      .run();

    assertFile(path.resolve(buildDir, 'html.js'));
    assertFile(path.resolve(buildDir, 'html.map'));
    assertFile(path.resolve(buildDir, 'html.pre.js'), true);

    assertFile(path.resolve(buildDir, 'xml.js'));
    assertFile(path.resolve(buildDir, 'xml.map'));

    assertFile(path.resolve(buildDir, 'helper.js'));
    assertFile(path.resolve(buildDir, 'helper.map'));

    assertFile(path.resolve(buildDir, 'example_html.js'));
    assertFile(path.resolve(buildDir, 'component', 'html.js'));
    assertFile(path.resolve(webroot, 'img', 'banner.png'));

    // test if manifest contains correct entries
    const manifest = await fs.readJson(path.resolve(buildDir, 'manifest.json'));
    assert.deepStrictEqual(manifest, {
      'dist/vendor/example.css': {
        hash: 'f9806776872f8ff4940b806f94923c4d',
        size: 658,
      },
      'img/banner.png': {
        hash: 'd41d8cd98f00b204e9800998ecf8427e',
        size: 0,
      },
      'welcome.txt': {
        hash: 'd6fc0d7dfc73e69219b8a3d110b69cb0',
        size: 24,
      },
      'welcome2.txt': {
        hash: 'a515caa30ad5ad5656b3cc844dd77b42',
        size: 32,
      },
    });

    // test if source map contains correct reference
    const htmlJs = await fs.readFile(path.resolve(buildDir, 'html.js'), 'utf-8');
    assert.ok(htmlJs.indexOf('sourceMappingURL=html.map') >= 0);

    // test if xml.js is wrapped
    const xmlJS = await fs.readFile(path.resolve(buildDir, 'xml.js'), 'utf-8');
    assert.ok(xmlJS.indexOf('return async function wrapped(params)') >= 0);

    // test if helper.js is not wrapped
    const helperJS = await fs.readFile(path.resolve(buildDir, 'helper.js'), 'utf-8');
    assert.equal(helperJS.indexOf('return async function wrapped(params)') >= 0, false);

    // test if xml.info.json contains helper as dependency
    const xmlInfo = await fs.readJson(path.resolve(buildDir, 'xml.info.json'));
    assert.deepEqual(xmlInfo, {
      main: 'xml.js',
      requires: [
        'helper.js',
      ],
    });
  });
});
