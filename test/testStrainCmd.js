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
// eslint-disable-next-line no-unused-vars
const Replay = require('replay');
Replay.mode = 'replay';

describe('hlx strain (Integration)', () => {
  it('Dry-Run Strain Publishing', (done) => {
    const cmd = new StrainCommand()
      .withDryRun(true)
      .withFastlyAuth('fakefakefakeohsofake')
      .withFastlyNamespace('3l2MjGcHgWw5NUJz7OKYH3')
      .withWskHost('runtime.adobe.io')
      .withWskAuth('fakeuser:faketoken')
      .withWskNamespace('trieloff');

    cmd.run().then(() => {
      done();
    });
  });
});
