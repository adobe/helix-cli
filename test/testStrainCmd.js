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
const path = require('path');
const assert = require('assert');
const { createTestRoot } = require('./utils.js');
const StrainCommand = require('../src/strain.cmd');
const strainconfig = require('../src/strain-config-utils');

// disable replay for this test
Replay.mode = 'bloody';
Replay.fixtures = path.resolve(__dirname, 'fixtures');

const FASTLY_AUTH = '---';
const WSK_AUTH = 'nope';

const SRC_STRAINS = path.resolve(__dirname, 'fixtures/strains.yaml');

describe('hlx strain (VCL) generation', () => {
  it('getVCL generates VLC for empty strains', () => {
    const strainfile = strainconfig.load(fs.readFileSync(path.resolve(__dirname, 'fixtures/empty.yaml')));
    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/empty.vcl')).toString();
    assert.equal(vclfile, StrainCommand.getVCL(strainfile));
  });

  it('getVCL generates VLC for non-existing conditions strains', () => {
    const strainfile = strainconfig.load(fs.readFileSync(path.resolve(__dirname, 'fixtures/default.yaml')));
    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/default.vcl')).toString();
    assert.equal(vclfile, StrainCommand.getVCL(strainfile));
  });

  it('getVCL generates VLC for simple conditions strains', () => {
    const strainfile = strainconfig.load(fs.readFileSync(path.resolve(__dirname, 'fixtures/simple-condition.yaml')));
    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/simple-condition.vcl')).toString();
    assert.equal(vclfile, StrainCommand.getVCL(strainfile));
  });
});

describe('hlx strain (Integration)', () => {
  let hlxDir;
  let dstStrains;

  beforeEach(async () => {
    const testRoot = await createTestRoot();
    hlxDir = path.resolve(testRoot, '.hlx');
    dstStrains = path.resolve(hlxDir, 'strains.yaml');

    await fs.mkdirp(hlxDir);
    await fs.copyFile(SRC_STRAINS, dstStrains);
    Replay.mode = 'replay';
  });

  afterEach(async () => {
    Replay.mode = 'bloody';
  });

  it('Publish Strains on an existing Service Config', (done) => {
    const cmd = new StrainCommand()
      .withStrainFile(dstStrains)
      .withDryRun(true)
      .withFastlyAuth(FASTLY_AUTH)
      .withFastlyNamespace('54nWWFJicKgbdVHou26Y6a')
      .withWskHost('runtime.adobe.io')
      .withWskAuth(WSK_AUTH)
      .withWskNamespace('trieloff');

    cmd.run().then(() => {
      done();
    }).catch(done);
  }).timeout(10000);

  it('Publish Strains on a new Service Config', (done) => {
    const cmd = new StrainCommand()
      .withStrainFile(dstStrains)
      .withDryRun(true)
      .withFastlyAuth(FASTLY_AUTH)
      .withFastlyNamespace('54nWWFJicKgbdVHou26Y6a')
      .withWskHost('runtime.adobe.io')
      .withWskAuth(WSK_AUTH)
      .withWskNamespace('trieloff');

    cmd.run().then(() => {
      done();
    }).catch(done);
  }).timeout(10000);
});
