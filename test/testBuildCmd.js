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
  this.timeout(60000);
  let testRoot;
  let buildDir;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    buildDir = path.resolve(testRoot, '.hlx/build');
    await fs.copy(TEST_DIR, testRoot);
    return true;
  });

  afterEach(async () => {
    await fs.remove(testRoot);
  });

  it('build command succeeds and produces files', async () => {
    await new BuildCommand()
      .withFiles(['src/**/*.htl', 'src/**/*.js'])
      .withDirectory(path.resolve(__dirname, 'integration'))
      .withTargetDir(buildDir)
      .withRequiredModules([])
      .run();

    assertFile(path.resolve(buildDir, 'src', 'html.js'));
    assertFile(path.resolve(buildDir, 'src', 'html.script.js'));
    assertFile(path.resolve(buildDir, 'src', 'html.script.js.map'));
    assertFile(path.resolve(buildDir, 'src', 'html.pre.js'), true);
    assertFile(path.resolve(buildDir, 'src', 'helper.js'), true);

    assertFile(path.resolve(buildDir, 'src', 'xml.js'));
    assertFile(path.resolve(buildDir, 'src', 'xml.script.js'), true);

    assertFile(path.resolve(buildDir, 'src', 'example_html.js'));
    assertFile(path.resolve(buildDir, 'src', 'component', 'comp_html.js'));

    // test if source map contains correct reference
    const htmlJs = await fs.readFile(path.resolve(buildDir, 'src', 'html.script.js'), 'utf-8');
    assert.ok(htmlJs.indexOf('sourceMappingURL=html.script.js.map') >= 0);
  });

  it('build provides a default pipeline', async () => {
    await new BuildCommand()
      .withFiles(['src/**/*.htl', 'src/**/*.js'])
      .withDirectory(path.resolve(__dirname, 'integration'))
      .withTargetDir(buildDir)
      .run();

    const pipelinePackageJson = path.resolve(buildDir, 'node_modules', '@adobe/helix-pipeline', 'package.json');
    assertFile(pipelinePackageJson);
  });

  it('build can use a custom pipeline', async () => {
    await new BuildCommand()
      .withFiles(['src/**/*.htl', 'src/**/*.js'])
      .withDirectory(path.resolve(__dirname, 'integration'))
      .withTargetDir(buildDir)
      .withCustomPipeline('@adobe/helix-pipeline@1.0.0')
      .run();

    const pipelinePackageJson = path.resolve(buildDir, 'node_modules', '@adobe/helix-pipeline', 'package.json');
    assertFile(pipelinePackageJson);
    const pkg = await fs.readJson(pipelinePackageJson);
    assert.equal(pkg.version, '1.0.0');
  });

  it('build can use a custom pipeline from git tag', async () => {
    await new BuildCommand()
      .withFiles(['src/**/*.htl', 'src/**/*.js'])
      .withDirectory(path.resolve(__dirname, 'integration'))
      .withTargetDir(buildDir)
      .withCustomPipeline('https://github.com/adobe/helix-pipeline.git#v1.1.0')
      .run();

    const pipelinePackageJson = path.resolve(buildDir, 'node_modules', '@adobe/helix-pipeline', 'package.json');
    assertFile(pipelinePackageJson);
    const pkg = await fs.readJson(pipelinePackageJson);
    assert.equal(pkg.version, '1.1.0');
  });
});
