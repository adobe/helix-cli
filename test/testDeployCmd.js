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
const DeployCommand = require('../src/deploy.cmd.js');

const HLX_DIR = path.resolve(__dirname, 'integration', '.hlx');
const BUILD_DIR = path.resolve(HLX_DIR, 'build');
const STRAIN_FILE = path.resolve(HLX_DIR, 'strains.yaml');

describe('hlx deploy (Integration)', () => {
  beforeEach(async () => {
    await fs.remove(HLX_DIR);
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
      .withTarget(BUILD_DIR)
      .withStrainFile(STRAIN_FILE)
      .run();

    assert.ok(fs.existsSync(STRAIN_FILE));
    const firstrun = fs.readFileSync(STRAIN_FILE).toString();

    await fs.remove(HLX_DIR);
    await new DeployCommand()
      .withWskHost('runtime.adobe.io')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true)
      .withContent('git@github.com:adobe/helix-cli')
      .withTarget(BUILD_DIR)
      .withStrainFile(STRAIN_FILE)
      .run();

    assert.ok(fs.existsSync(STRAIN_FILE));
    const secondrun = fs.readFileSync(STRAIN_FILE).toString();
    assert.equal(firstrun, secondrun, 'generated strains.yaml differs between first and second run');

    await new DeployCommand()
      .withWskHost('runtime.adobe.io')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true)
      .withContent('https://github.com/adobe/helix-cli/tree/implement-init')
      .withTarget(BUILD_DIR)
      .withStrainFile(STRAIN_FILE)
      .run();

    assert.ok(fs.existsSync(STRAIN_FILE));
    const thirdrun = fs.readFileSync(STRAIN_FILE).toString();
    assert.notEqual(firstrun, thirdrun);
  }).timeout(10000);
});
