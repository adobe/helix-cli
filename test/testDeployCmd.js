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
const { createTestRoot, assertZipEntry, assertFile } = require('./utils.js');
const DeployCommand = require('../src/deploy.cmd.js');
const strainconfig = require('../src/strain-config-utils');

describe('hlx deploy (Integration)', () => {
  let hlxDir;
  let buildDir;
  let strainsFile;
  let srcFile;
  let zipFile;
  let distDir;
  let staticFile;

  beforeEach(async () => {
    const testRoot = await createTestRoot();
    hlxDir = path.resolve(testRoot, '.hlx');
    buildDir = path.resolve(hlxDir, 'build');
    distDir = path.resolve(hlxDir, 'dist');
    strainsFile = path.resolve(hlxDir, 'strains.yaml');
    srcFile = path.resolve(buildDir, 'html.js');
    staticFile = path.resolve(distDir, 'style.css');
    zipFile = path.resolve(buildDir, 'my-prefix-html.zip');
    await fs.outputFile(srcFile, 'main(){};');
    await fs.outputFile(staticFile, 'body { background-color: black; }');
  });

  it('Dry-Running works', async () => {
    await new DeployCommand()
      .withWskHost('runtime.adobe.io')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withPrefix('my-prefix-')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true)
      .withContent('git@github.com:adobe/helix-cli')
      .withTarget(buildDir)
      .withStaticContent('none')
      .withStrainFile(strainsFile)
      .run();

    await assertFile(strainsFile);
    await assertZipEntry(zipFile, 'dist/style.css', false);
    const firstrun = fs.readFileSync(strainsFile).toString();

    await fs.remove(buildDir);
    await new DeployCommand()
      .withWskHost('runtime.adobe.io')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withPrefix('my-prefix-')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true)
      .withContent('git@github.com:adobe/helix-cli')
      .withTarget(buildDir)
      .withStaticContent('none')
      .withStrainFile(strainsFile)
      .run();

    await assertFile(strainsFile);
    const secondrun = fs.readFileSync(strainsFile).toString();
    assert.equal(firstrun, secondrun, 'generated strains.yaml differs between first and second run');

    await new DeployCommand()
      .withWskHost('runtime.adobe.io')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withPrefix('my-prefix-')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true)
      .withContent('https://github.com/adobe/helix-cli/tree/implement-init')
      .withTarget(buildDir)
      .withStaticContent('none')
      .withStrainFile(strainsFile)
      .run();

    await assertFile(strainsFile);
    const thirdrun = fs.readFileSync(strainsFile).toString();
    assert.notEqual(firstrun, thirdrun);
  }).timeout(10000);

  it('includes the static files into the zip for static-content=bundled', async () => {
    await new DeployCommand()
      .withWskHost('runtime.adobe.io')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withPrefix('my-prefix-')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true)
      .withContent('git@github.com:adobe/helix-cli')
      .withTarget(buildDir)
      .withStrainFile(strainsFile)
      .withStaticContent('bundled')
      .run();

    await assertZipEntry(zipFile, 'dist/style.css');
  });

  it('prepares the static content for github distribution', async () => {
    await new DeployCommand()
      .withWskHost('runtime.adobe.io')
      .withWskAuth('secret-key')
      .withWskNamespace('hlx')
      .withPrefix('my-prefix-')
      .withEnableAuto(false)
      .withEnableDirty(true)
      .withDryRun(true)
      .withContent('git@github.com:adobe/helix-cli')
      .withTarget(buildDir)
      .withStrainFile(strainsFile)
      .withStaticContent('github')
      .run();

    const gitDir = path.resolve(hlxDir, 'tmp/gh-static/my-prefix-');
    await assertFile(path.resolve(gitDir, 'style.css'));

    const strains = strainconfig.load(fs.readFileSync(strainsFile).toString());
    assert.equal(strains[0].githubStatic.repo, 'helix-cli');
    assert.equal(strains[0].githubStatic.ref, '0000000000000000000000000000');
    // todo: this will probably fail on a fork
    assert.equal(strains[0].githubStatic.owner, 'adobe');
  });
  
  it('setDeployOptions() #unittest', () => {
    const options = DeployCommand.getBuildVarOptions('FOO', 'BAR', 'adobe', 'helix-cli', {});
    assert.equal(options.method, 'POST');
    assert.equal(JSON.parse(options.body).name, 'FOO');
    assert.equal(JSON.parse(options.body).value, 'BAR');
  });
});
