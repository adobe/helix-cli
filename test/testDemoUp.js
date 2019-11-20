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

const {
  assertHttp, createTestRoot, getTestModules,
} = require('./utils.js');

const UpCommand = require('../src/up.cmd');
const DemoCommand = require('../src/demo.cmd');

describe('Integration test for demo + up command', () => {
  let testRoot;
  let testModules;

  before(async function beforeAll() {
    this.timeout(60000); // ensure enough time for installing modules on slow machines
    testModules = [await getTestModules(), ...module.paths];
  });

  beforeEach(async () => {
    testRoot = await createTestRoot();
  });

  afterEach(async () => {
    await fse.remove(testRoot);
  });

  ['simple', 'full'].forEach(async (demoType) => {
    it(`up command delivers expected output with ${demoType} demo`, async () => {
      const demoName = `demo-${demoType}`;
      const testDir = `${testRoot}/${demoName}`;
      const buildDir = await path.resolve(testDir, '.hlx/build');

      await new DemoCommand()
        .withDirectory(testRoot)
        .withName(demoName)
        .withType(demoType)
        .run();

      const cmd = new UpCommand()
        .withFiles([
          path.join(testDir, 'src', '*.htl'),
          path.join(testDir, 'src', '*.js'),
          path.join(testDir, 'src', 'utils', '*.js'),
        ])
        .withTargetDir(buildDir)
        .withModulePaths(testModules)
        .withDirectory(testDir)
        .withHttpPort(0);

      await new Promise((resolve) => {
        cmd
          .on('started', resolve)
          .run();
      });

      try {
        await assertHttp(`http://localhost:${cmd.project.server.port}/index.html`, 200, [
          `<title>Helix - ${demoName}</title>`,
          `<p>It works! ${demoName} is up and running.</p>`,
        ]);
      } catch (e) {
        assert.fail(e);
      } finally {
        await cmd.stop();
      }
    }).timeout(10000);
  });
});
