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
const winston = require('winston');
const { GitUtils } = require('@adobe/helix-shared');
const { initGit, createTestRoot } = require('./utils.js');
const BuildCommand = require('../src/build.cmd.js');
const DeployCommand = require('../src/deploy.cmd.js');
const { makeTestLogger } = require('../src/log-common');

const CI_TOKEN = 'nope';
const TEST_DIR = path.resolve('test/integration');

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
    strainsFile = path.resolve(hlxDir, 'strains.json');

    cwd = process.cwd();

    // reset the winston loggers
    winston.loggers.loggers.clear();

    Replay.mode = 'replay';
    // don't record the authorization header
    replayheaders = Replay.headers;
    Replay.headers = Replay.headers.filter(e => new RegExp(e).toString() !== new RegExp(/^authorization/).toString());
  });

  afterEach(() => {
    // fs.remove(testRoot);
    Replay.mode = 'bloody';
    Replay.headers = replayheaders;
    $.cd(cwd);
  });

  it('deploy fails if no helix-config is present.', async () => {
    initGit(testRoot);
    try {
      await new DeployCommand()
        .withDirectory(testRoot)
        .withWskHost('adobeioruntime.net')
        .withWskAuth('secret-key')
        .withWskNamespace('hlx')
        .withEnableAuto(false)
        .withEnableDirty(true)
        .withDryRun(true)
        .withTarget(buildDir)
        .withStrainFile(strainsFile)
        .withFastlyAuth('nope')
        .withFastlyNamespace('justtesting')
        .withCircleciAuth(CI_TOKEN)
        .run();
      assert.fail('deploy should fail if no helix-config is present');
    } catch (e) {
      assert.ok(e.toString().indexOf('Error: Invalid configuration:') === 0);
    }
  });

  it('deploy fails if no git remote', async () => {
    await fs.copy(TEST_DIR, testRoot);
    await fs.rename(path.resolve(testRoot, 'default-config.yaml'), path.resolve(testRoot, 'helix-config.yaml'));
    initGit(testRoot);
    try {
      await new DeployCommand()
        .withDirectory(testRoot)
        .withWskHost('adobeioruntime.net')
        .withWskAuth('secret-key')
        .withWskNamespace('hlx')
        .withEnableAuto(false)
        .withEnableDirty(true)
        .withDryRun(true)
        .withTarget(buildDir)
        .withStrainFile(strainsFile)
        .withFastlyAuth('nope')
        .withFastlyNamespace('justtesting')
        .withCircleciAuth(CI_TOKEN)
        .run();
      assert.fail('deploy fails if no git remote');
    } catch (e) {
      assert.equal(e.toString(), 'Error: hlx cannot deploy without a remote git repository.');
    }
  });

  it('deploy fails if dirty', async () => {
    await fs.copy(TEST_DIR, testRoot);
    await fs.rename(path.resolve(testRoot, 'default-config.yaml'), path.resolve(testRoot, 'helix-config.yaml'));
    initGit(testRoot, 'git@github.com:adobe/project-helix.io.git');
    await fs.copy(path.resolve(testRoot, 'README.md'), path.resolve(testRoot, 'README-copy.md'));
    try {
      await new DeployCommand()
        .withDirectory(testRoot)
        .withWskHost('adobeioruntime.net')
        .withWskAuth('secret-key')
        .withWskNamespace('hlx')
        .withEnableAuto(false)
        .withEnableDirty(false)
        .withDryRun(true)
        .withTarget(buildDir)
        .withStrainFile(strainsFile)
        .withFastlyAuth('nope')
        .withFastlyNamespace('justtesting')
        .withCircleciAuth(CI_TOKEN)
        .run();
      assert.fail('deploy fails if dirty');
    } catch (e) {
      assert.equal(e.toString(), 'Error: hlx will not deploy a working copy that has uncommitted changes. Re-run with flag --dirty to force.');
    }
  });

  it('deploy fails if no strain is affected', async () => {
    await fs.copy(TEST_DIR, testRoot);
    await fs.rename(path.resolve(testRoot, 'default-config.yaml'), path.resolve(testRoot, 'helix-config.yaml'));
    initGit(testRoot, 'git@github.com:adobe/project-foo.io.git');
    const logger = makeTestLogger();
    try {
      await new DeployCommand(logger)
        .withDirectory(testRoot)
        .withWskHost('adobeioruntime.net')
        .withWskAuth('secret-key')
        .withWskNamespace('hlx')
        .withEnableAuto(false)
        .withEnableDirty(false)
        .withDryRun(true)
        .withTarget(buildDir)
        .withStrainFile(strainsFile)
        .withFastlyAuth('nope')
        .withFastlyNamespace('justtesting')
        .withCircleciAuth(CI_TOKEN)
        .run();
      assert.fail('deploy fails if no stain is affected');
    } catch (e) {
      const log = await logger.getOutput();
      assert.ok(log.indexOf('warn: Remote repository [36mssh://git@github.com/adobe/project-foo.io.git#master[39m does not affect any strains.') >= 0);
    }
  });

  it('deploy reports affected strains', async () => {
    await fs.copy(TEST_DIR, testRoot);
    await fs.rename(path.resolve(testRoot, 'default-config.yaml'), path.resolve(testRoot, 'helix-config.yaml'));
    initGit(testRoot, 'git@github.com:adobe/project-helix.io.git');
    const logger = makeTestLogger();
    await new DeployCommand(logger)
      .withDirectory(testRoot)
      .withWskHost('adobeioruntime.net')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withEnableAuto(false)
      .withEnableDirty(false)
      .withDryRun(true)
      .withTarget(buildDir)
      .withStrainFile(strainsFile)
      .withFastlyAuth('nope')
      .withFastlyNamespace('justtesting')
      .withCircleciAuth(CI_TOKEN)
      .withCreatePackages('ignore')
      .run();

    const log = await logger.getOutput();
    assert.ok(log.indexOf('Affected strains of ssh://git@github.com/adobe/project-helix.io.git#master') >= 0);
    assert.ok(log.indexOf('- dev') >= 0);
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
    await fs.copy(TEST_DIR, testRoot);
    await fs.rename(path.resolve(testRoot, 'default-config.yaml'), path.resolve(testRoot, 'helix-config.yaml'));
    initGit(testRoot, 'git@github.com:adobe/project-helix.io.git');
    const logger = makeTestLogger();

    await new BuildCommand(logger)
      .withDirectory(testRoot)
      .withFiles([
        path.resolve(testRoot, 'src/html.htl'),
        path.resolve(testRoot, 'src/html.pre.js'),
        path.resolve(testRoot, 'src/helper.js'),
      ])
      .withTargetDir(buildDir)
      .withWebRoot(path.resolve('webroot'))
      .withCacheEnabled(false)
      .run();

    await new DeployCommand(logger)
      .withDirectory(testRoot)
      .withWskHost('adobeioruntime.net')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withEnableAuto(false)
      .withEnableDirty(false)
      .withDryRun(true)
      .withTarget(buildDir)
      .withStrainFile(strainsFile)
      .run();

    const ref = GitUtils.getCurrentRevision(testRoot);
    const log = await logger.getOutput();
    assert.ok(log.indexOf('deployment of 2 actions completed') >= 0);
    assert.ok(log.indexOf(`- hlx/${ref}--html`) >= 0);
    assert.ok(log.indexOf('- hlx/hlx--static') >= 0);
  }).timeout(30000);
});

describe('DeployCommand #unittest', () => {
  it('setDeployOptions() #unittest', () => {
    const options = DeployCommand.getBuildVarOptions('FOO', 'BAR', 'adobe', 'helix-cli', {});
    assert.equal(options.method, 'POST');
    assert.equal(JSON.parse(options.body).name, 'FOO');
    assert.equal(JSON.parse(options.body).value, 'BAR');
  });
});
