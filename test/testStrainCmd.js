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
// disable replay for this test
Replay.mode = 'bloody';

const FASTLY_AUTH = '---';
const WSK_AUTH = 'nope';

describe('hlx strain (Integration)', () => {
  beforeEach(() => {
    fs.mkdirpSync('.hlx');
    fs.copyFileSync('fixtures/strains.yaml', '.hlx/strains.yaml');
    Replay.mode = 'replay';
  });

  afterEach(() => {
    fs.removeSync('.hlx');
    Replay.mode = 'bloody';
  });

  it('Publish Strains on an existing Service Config', (done) => {
    const cmd = new StrainCommand()
      .withDryRun(true)
      .withFastlyAuth(FASTLY_AUTH)
      .withFastlyNamespace('5f1f7zaYVhxZQ7FRO8tvle')
      .withWskHost('runtime.adobe.io')
      .withWskAuth(WSK_AUTH)
      .withWskNamespace('trieloff');

    cmd.run().then(() => {
      done();
    });
  }).timeout(10000);

  it('Publish Strains on a new Service Config', (done) => {
    const cmd = new StrainCommand()
      .withDryRun(true)
      .withFastlyAuth(FASTLY_AUTH)
      .withFastlyNamespace('2120n5jqvwdRW0XEJ1rzfc')
      .withWskHost('runtime.adobe.io')
      .withWskAuth(WSK_AUTH)
      .withWskNamespace('trieloff');

    cmd.run().then(() => {
      done();
    });
  }).timeout(10000);
});
