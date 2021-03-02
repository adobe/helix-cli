/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* global describe, it, beforeEach */
process.env.HELIX_FETCH_FORCE_HTTP1 = 'true';

const sinon = require('sinon');
const CLI = require('../src/cli.js');
const CleanCommand = require('../src/auth.cmd');

describe('hlx auth', () => {
  // mocked command instance
  let mockBuild;

  beforeEach(() => {
    mockBuild = sinon.createStubInstance(CleanCommand);
    mockBuild.run.returnsThis();
  });

  it('hlx auth runs w/o arguments', () => {
    new CLI()
      .withCommandExecutor('auth', mockBuild)
      .run(['auth']);
    sinon.assert.calledOnce(mockBuild.run);
  });
});
