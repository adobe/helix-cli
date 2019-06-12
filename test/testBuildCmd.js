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

describe('Integration test for build', function suite() {
  this.timeout(20000);
  let testRoot;
  let buildDir;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    buildDir = path.resolve(testRoot, '.hlx/build');
    await fs.copy(TEST_DIR, testRoot);
    return true;
  });

  it('build command succeeds and produces files', async () => {
    await new BuildCommand()
      .withFiles(['test/integration/src/**/*.htl', 'test/integration/src/**/*.js'])
      .withTargetDir(buildDir)
      .run();

    assertFile(path.resolve(buildDir, 'html.js'));
    assertFile(path.resolve(buildDir, 'html.js.map'));
    assertFile(path.resolve(buildDir, 'html.pre.js'));

    assertFile(path.resolve(buildDir, 'xml.js'));
    assertFile(path.resolve(buildDir, 'xml.js.map'));

    assertFile(path.resolve(buildDir, 'helper.js'));
    assertFile(path.resolve(buildDir, 'helper.js.map'));

    assertFile(path.resolve(buildDir, 'example_html.js'));
    assertFile(path.resolve(buildDir, 'component', 'html.js'));

    // test if source map contains correct reference
    const htmlJs = await fs.readFile(path.resolve(buildDir, 'html.js'), 'utf-8');
    assert.ok(htmlJs.indexOf('sourceMappingURL=html.js.map') >= 0);

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
