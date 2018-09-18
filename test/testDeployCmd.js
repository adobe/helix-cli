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

const Replay = require('replay');
const fs = require('fs-extra');
const assert = require('assert');
const path = require('path');
const $ = require('shelljs');
const { createTestRoot, assertFile } = require('./utils.js');
const DeployCommand = require('../src/deploy.cmd.js');

const CI_TOKEN = 'nope';

Replay.mode = 'bloody';
Replay.fixtures = `${__dirname}/fixtures/`;

describe('hlx deploy (Integration)', () => {
  let testRoot;
  let hlxDir;
  let buildDir;
  let strainsFile;
  let replayheaders;
  let cwd;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    hlxDir = path.resolve(testRoot, '.hlx');
    buildDir = path.resolve(hlxDir, 'build');
    strainsFile = path.resolve(hlxDir, 'strains.yaml');

    cwd = process.cwd();

    Replay.mode = 'replay';
    // don't record the authorization header
    replayheaders = Replay.headers;
    Replay.headers = Replay.headers.filter(e => new RegExp(e).toString() !== new RegExp(/^authorization/).toString());
  });

  afterEach(() => {
    fs.remove(testRoot);
    Replay.mode = 'bloody';
    Replay.headers = replayheaders;
    $.cd(cwd);
  });

  it.skip('Auto-Deploy works', (done) => {
    try {
      $.cd(testRoot);
      $.exec('git clone https://github.com/trieloff/helix-helpx.git');
      $.cd(path.resolve(testRoot, 'helix-helpx'));

      new DeployCommand()
        .withWskHost('adobeioruntime.net')
        .withWskAuth('secret-key')
        .withWskNamespace('hlx')
        .withEnableAuto(true)
        .withEnableDirty(true)
        .withDryRun(true)
        .withContent('git@github.com:adobe/helix-cli')
        .withTarget(buildDir)
        .withStrainFile(strainsFile)
        .withFastlyAuth('nope')
        .withFastlyNamespace('justtesting')
        .withCircleciAuth(CI_TOKEN)
        .run()
        .then(() => { done(); });
    } catch (e) {
      done(e);
    }
  }).timeout(15000);

  it('Dry-Running works', async () => {
    await new DeployCommand()
      .withDirectory(testRoot)
      .withWskHost('adobeioruntime.net')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true)
      .withContent('git@github.com:adobe/helix-cli')
      .withTarget(buildDir)
      .withStrainFile(strainsFile)
      .run();

    assertFile(strainsFile);
    const firstrun = fs.readFileSync(strainsFile).toString();

    await fs.remove(buildDir);
    await new DeployCommand()
      .withDirectory(testRoot)
      .withWskHost('adobeioruntime.net')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true)
      .withContent('git@github.com:adobe/helix-cli')
      .withTarget(buildDir)
      .withStrainFile(strainsFile)
      .run();

    assertFile(strainsFile);
    const secondrun = fs.readFileSync(strainsFile).toString();
    assert.equal(firstrun, secondrun, 'generated strains.yaml differs between first and second run');

    await new DeployCommand()
      .withDirectory(testRoot)
      .withWskHost('adobeioruntime.net')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true)
      .withContent('https://github.com/adobe/helix-cli/tree/implement-init')
      .withTarget(buildDir)
      .withStrainFile(strainsFile)
      .run();

    assertFile(strainsFile);
    const thirdrun = fs.readFileSync(strainsFile).toString();
    assert.notEqual(firstrun, thirdrun);
  }).timeout(10000);
});

describe('DeployCommand #unittest', () => {
  it('setDeployOptions() #unittest', () => {
    const options = DeployCommand.getBuildVarOptions('FOO', 'BAR', 'adobe', 'helix-cli', {});
    assert.equal(options.method, 'POST');
    assert.equal(JSON.parse(options.body).name, 'FOO');
    assert.equal(JSON.parse(options.body).value, 'BAR');
  });
});
