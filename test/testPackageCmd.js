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

const fs = require('fs-extra');
const path = require('path');
const { createTestRoot, assertZipEntries } = require('./utils.js');
const BuildCommand = require('../src/build.cmd.js');
const PackageCommand = require('../src/package.cmd.js');

describe('hlx package (Integration)', () => {
  let testRoot;
  let hlxDir;
  let buildDir;
  let webroot;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    hlxDir = path.resolve(testRoot, '.hlx');
    buildDir = path.resolve(hlxDir, 'build');
    webroot = path.resolve(testRoot, 'webroot');
  });

  afterEach(() => {
    fs.remove(testRoot);
  });

  it('package create correct package', async () => {
    await new BuildCommand()
      .withFiles([
        'test/integration/src/html.htl',
        'test/integration/src/html.pre.js',
        'test/integration/src/helper.js',
        // 'test/integration/src/xml.js',
      ])
      .withTargetDir(buildDir)
      .withWebRoot(webroot)
      .withCacheEnabled(false)
      .run();

    await new PackageCommand()
      .withDirectory(testRoot)
      .withTarget(buildDir)
      .run();

    await assertZipEntries(
      path.resolve(buildDir, 'html.zip'),
      ['package.json', 'html.js', 'html.pre.js', 'helper.js'],
    );
    await assertZipEntries(
      path.resolve(buildDir, 'static.zip'),
      ['package.json', 'static.js'],
    );
    // await assertZipEntries(
    //   path.resolve(buildDir, 'git-github-com-adobe-helix-cli--dirty--xml.zip'),
    //   ['package.json', 'xml.js', 'helper.js'],
    // );
  }).timeout(60000);
});
