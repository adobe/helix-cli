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
const assert = require('assert');
const path = require('path');
const { createTestRoot } = require('./utils.js');
const DeployCommand = require('../src/deploy.cmd.js');

describe('hlx deploy (Integration)', () => {
  let hlxDir;
  let buildDir;
  let strainsFile;

  beforeEach(async () => {
    const testRoot = await createTestRoot();
    hlxDir = path.resolve(testRoot, '.hlx');
    buildDir = path.resolve(hlxDir, 'build');
    strainsFile = path.resolve(hlxDir, 'strains.yaml');
  });

  it('Dry-Running works', async () => {
    await new DeployCommand()
      .withWskHost('runtime.adobe.io')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true)
      .withContent('git@github.com:adobe/helix-cli')
      .withTarget(buildDir)
      .withStrainFile(strainsFile)
      .run();

    assert.ok(fs.existsSync(strainsFile));
    const firstrun = fs.readFileSync(strainsFile).toString();

    await fs.remove(buildDir);
    await new DeployCommand()
      .withWskHost('runtime.adobe.io')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true)
      .withContent('git@github.com:adobe/helix-cli')
      .withTarget(buildDir)
      .withStrainFile(strainsFile)
      .run();

    assert.ok(fs.existsSync(strainsFile));
    const secondrun = fs.readFileSync(strainsFile).toString();
    assert.equal(firstrun, secondrun, 'generated strains.yaml differs between first and second run');

    await new DeployCommand()
      .withWskHost('runtime.adobe.io')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true)
      .withContent('https://github.com/adobe/helix-cli/tree/implement-init')
      .withTarget(buildDir)
      .withStrainFile(strainsFile)
      .run();

    assert.ok(fs.existsSync(strainsFile));
    const thirdrun = fs.readFileSync(strainsFile).toString();
    assert.notEqual(firstrun, thirdrun);
  }).timeout(10000);
});
