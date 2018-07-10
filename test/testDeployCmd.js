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

const CLI = require('../src/cli');

describe('hlx deploy (Integration)', () => {
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
    done();
  });
});
