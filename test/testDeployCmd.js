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
    strainsFile = path.resolve(hlxDir, 'strains.json');

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
    assert.deepEqual(JSON.parse(firstrun), JSON.parse(secondrun), 'generated strains.json differs between first and second run');

    await new DeployCommand()
      .withDirectory(testRoot)
      .withWskHost('adobeioruntime.net')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true)
      .withContent('https://github.com/adobe/helix-cli.git#implement-init')
      .withTarget(buildDir)
      .withStrainFile(strainsFile)
      .run();

    assertFile(strainsFile);
    const thirdrun = fs.readFileSync(strainsFile).toString();
    assert.notDeepEqual(JSON.parse(firstrun), JSON.parse(thirdrun));
  }).timeout(30000);

  it('hlx deploy defines a default content url', async () => {
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
      .run();

    assertFile(strainsFile);
    const run = fs.readFileSync(strainsFile).toString();
    const json = JSON.parse(run);
    assert.ok(json.default && json.default.content, 'default content is present');
    // default is GitUrl internal default.
    assert.deepEqual(json.default.content, {
      protocol: 'http',
      host: 'localhost',
      port: '',
      hostname: 'localhost',
      owner: 'local',
      repo: 'default',
      ref: '',
      path: '',
    });
  }).timeout(15000);
});

describe('DeployCommand #unittest', () => {
  it('setDeployOptions() #unittest', () => {
    const options = DeployCommand.getBuildVarOptions('FOO', 'BAR', 'adobe', 'helix-cli', {});
    assert.equal(options.method, 'POST');
    assert.equal(JSON.parse(options.body).name, 'FOO');
    assert.equal(JSON.parse(options.body).value, 'BAR');
  });
});

describe('hlx deploy (Integration)', () => {
  async function getDefaultContentTest(test) {
    const buildFolder = path.resolve(test.configFolder, 'tmp');
    const cmd = new DeployCommand()
      .withDirectory(test.configFolder)
      .withTarget(buildFolder)
      .withWskHost('adobeioruntime.net')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true);
    await cmd.init();
    const url = cmd.getDefaultContentURL();
    assert.equal(test.expectedContentURL, url.toString());

    await cmd.run();
    const strain = path.resolve(test.configFolder, '.hlx/strains.json');
    assertFile(strain);
    const run = fs.readFileSync(strain).toString();
    const json = JSON.parse(run);
    assert.ok(json.default && json.default.content, 'default strain content is present');
    assert.deepEqual(json.default.content, test.expectedStrainContent);

    fs.remove(buildFolder);
    fs.remove(path.resolve(test.configFolder, '.hlx'));
  }

  it('getDefaultContentTest - content url is ssh', async () => {
    await getDefaultContentTest({
      configFolder: `${__dirname}/configs/git`,
      expectedContentURL: 'ssh://github.com/adobe/project-helix.io.git#abranch',
      expectedStrainContent: {
        protocol: 'ssh',
        host: 'github.com',
        port: '',
        hostname: 'github.com',
        owner: 'adobe',
        repo: 'project-helix.io',
        ref: 'abranch',
        path: '',
      },
    });
  });

  it('getDefaultContentTest - content url is https', async () => {
    await getDefaultContentTest({
      configFolder: `${__dirname}/configs/https`,
      expectedContentURL: 'https://github.com/adobe/project-helix.io.git#abranch',
      expectedStrainContent: {
        protocol: 'https',
        host: 'github.com',
        port: '',
        hostname: 'github.com',
        owner: 'adobe',
        repo: 'project-helix.io',
        ref: 'abranch',
        path: '',
      },
    });
  });

  // TODO review implementation because this is wrong! should not be http://localhost but https://github.com
  it('getDefaultContentTest - content url is in default strain', async () => {
    await getDefaultContentTest({
      configFolder: `${__dirname}/configs/strain`,
      expectedContentURL: 'https://github.com/adobe/project-helix.io.git#abranch',
      expectedStrainContent: {
        protocol: 'https',
        host: 'github.com',
        port: '',
        hostname: 'github.com',
        owner: 'adobe',
        repo: 'project-helix.io',
        ref: 'abranch',
        path: '',
      },
    });
  });

  // TODO review because this is meaningless - should fall back to git remote url ?
  // i.e. helix-cli when running the test case...
  it('getDefaultContentTest - empty config', async () => {
    await getDefaultContentTest({
      configFolder: `${__dirname}/configs/empty`,
      expectedContentURL: 'https://github.com/adobe/helix-cli.git',
      expectedStrainContent: {
        protocol: 'https',
        host: 'github.com',
        port: '',
        hostname: 'github.com',
        owner: 'adobe',
        repo: 'helix-cli',
        ref: '',
        path: '',
      },
    });
  });

  // TODO review: strain config has priority. Needs to be clear to developer.
  it('getDefaultContentTest - config contains content and default strain', async () => {
    await getDefaultContentTest({
      configFolder: `${__dirname}/configs/dual`,
      expectedContentURL: 'https://github.com/Adobe-Marketing-Cloud/reactor-user-docs.git#anotherbranch',
      expectedStrainContent: {
        protocol: 'https',
        host: 'github.com',
        port: '',
        hostname: 'github.com',
        owner: 'Adobe-Marketing-Cloud',
        repo: 'reactor-user-docs',
        ref: 'anotherbranch',
        path: '',
      },
    });
  });
});
