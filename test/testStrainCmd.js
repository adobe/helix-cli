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

const StrainCommand = require('../src/strain.cmd');
const Replay = require('replay');
const fs = require('fs-extra');
const path = require('path');
const { createTestRoot } = require('./utils.js');

// disable replay for this test
Replay.mode = 'bloody';
Replay.fixtures = path.resolve(__dirname, 'fixtures');

const FASTLY_AUTH = '---';
const WSK_AUTH = 'nope';

const SRC_STRAINS = path.resolve(__dirname, 'fixtures/strains.yaml');

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
      .withFastlyNamespace('5f1f7zaYVhxZQ7FRO8tvle')
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
      .withFastlyNamespace('2120n5jqvwdRW0XEJ1rzfc')
      .withWskHost('runtime.adobe.io')
      .withWskAuth(WSK_AUTH)
      .withWskNamespace('trieloff');

    cmd.run().then(() => {
      done();
    }).catch(done);
  }).timeout(10000);
});
