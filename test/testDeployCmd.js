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
const CLI = require('../src/cli');

describe('hlx deploy (Integration)', () => {
  fs.removeSync('.hlx');
  it('Dry-Running works', (done) => {
    new CLI()
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--no-auto',
        '--dirty',
        '--dry-run',
        '--target', 'test/integration/.hlx/build',
      ]);
    assert.ok(fs.existsSync('.hlx/strains.yaml'));
    const firstrun = fs.readFileSync('.hlx/strains.yaml').toString();

    fs.removeSync('.hlx');
    new CLI()
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--no-auto',
        '--dirty',
        '--dry-run',
        '--target', 'test/integration/.hlx/build',
      ]);
    assert.ok(fs.existsSync('.hlx/strains.yaml'));
    const secondrun = fs.readFileSync('.hlx/strains.yaml').toString();
    assert.equal(firstrun, secondrun, 'generated strains.yaml differs between first and second run');

    new CLI()
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--no-auto',
        '--dirty',
        '--dry-run',
        '--content', 'https://github.com/adobe/helix-cli/tree/implement-init',
        '--target', 'test/integration/.hlx/build',
      ]);
    assert.ok(fs.existsSync('.hlx/strains.yaml'));
    const thirdrun = fs.readFileSync('.hlx/strains.yaml').toString();
    assert.notEqual(firstrun, thirdrun);

    done();
  }).timeout(10000);
});
