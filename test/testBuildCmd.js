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

const BuildCommand = require('../src/build.cmd');

const HLX_DIR = path.resolve(__dirname, 'integration', '.hlx');
const BUILD_DIR = path.resolve(HLX_DIR, 'build');
const DIST_DIR = path.resolve(HLX_DIR, 'dist');
const SRC_DIR = path.resolve(__dirname, 'integration', 'src');

describe('Integration test for build', () => {
  it('build command succeeds and produces files', async () => {
    await new BuildCommand()
      .withFiles(['test/integration/src/**/*.htl'])
      .withTargetDir(BUILD_DIR)
      .withStaticDir(SRC_DIR)
      .withCacheEnabled(false)
      .run();

    assert.ok(fs.existsSync(path.resolve(BUILD_DIR, 'html.js')));
    assert.ok(!fs.existsSync(path.resolve(BUILD_DIR, 'html.pre.js')));
    assert.ok(fs.existsSync(path.resolve(BUILD_DIR, 'example_html.js')));
    assert.ok(fs.existsSync(path.resolve(BUILD_DIR, 'component', 'html.js')));
    assert.ok(fs.existsSync(path.resolve(DIST_DIR, 'welcome.txt')));
    assert.ok(fs.existsSync(path.resolve(DIST_DIR, 'component', 'foo.txt')));
  }).timeout(5000);
});
