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

/* global describe, it, beforeEach */

'use strict';

const sinon = require('sinon');
const CLI = require('../src/cli.js');
const CleanCommand = require('../src/clean.cmd');

describe('hlx clean', () => {
  // mocked command instance
  let mockBuild;

  beforeEach(() => {
    mockBuild = sinon.createStubInstance(CleanCommand);
    mockBuild.withTargetDir.returnsThis();
    mockBuild.run.returnsThis();
  });

  it('hlx clean runs w/o arguments', () => {
    new CLI()
      .withCommandExecutor('clean', mockBuild)
      .run(['clean']);
    sinon.assert.calledWith(mockBuild.withTargetDir, '.hlx/build');
    sinon.assert.calledOnce(mockBuild.run);
  });

  it('hlx clean can set target', () => {
    new CLI()
      .withCommandExecutor('clean', mockBuild)
      .run(['clean', '--target', 'tmp/build']);
    sinon.assert.calledWith(mockBuild.withTargetDir, 'tmp/build');
    sinon.assert.calledOnce(mockBuild.run);
  });
});
