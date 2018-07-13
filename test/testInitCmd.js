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

const InitCommand = require('../src/init.cmd');

const TEST_DIR = path.resolve(__dirname, 'tmp');

async function assertFile(p) {
  const exists = await fse.pathExists(p);
  if (!exists) {
    assert.fail(`Expected file at ${p} to exists`);
  }
}

describe('Integration test for init command', () => {
  beforeEach(() => {
    fse.removeSync(TEST_DIR);
  });

  it('init creates all files', async () => {
    await new InitCommand()
      .withDirectory(TEST_DIR)
      .withName('project1')
      .run();
    await assertFile(path.resolve(TEST_DIR, 'project1', '.gitignore'));
    await assertFile(path.resolve(TEST_DIR, 'project1', 'README.md'));
    await assertFile(path.resolve(TEST_DIR, 'project1', 'src/html.htl'));
    await assertFile(path.resolve(TEST_DIR, 'project1', 'src/html.pre.js'));
    await assertFile(path.resolve(TEST_DIR, 'project1', 'helix-config.yaml'));
    await assertFile(path.resolve(TEST_DIR, 'project1', 'index.md'));
    await assertFile(path.resolve(TEST_DIR, 'project1', 'package.json'));
  });
});
