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

const assert = require('assert');
const sinon = require('sinon');
const CLI = require('../src/cli.js');
const InitCommand = require('../src/init.cmd');

describe('hlx init', () => {
  // mocked command instance
  let mockInit;

  beforeEach(() => {
    mockInit = sinon.createStubInstance(InitCommand);
    mockInit.withDirectory.returnsThis();
    mockInit.withName.returnsThis();
    mockInit.run.returnsThis();
  });

  it('hlx init accepts name and directory', () => {
    new CLI()
      .withCommandExecutor('init', mockInit)
      .run(['init', 'name', 'dir']);

    sinon.assert.calledWith(mockInit.withName, 'name');
    sinon.assert.calledWith(mockInit.withDirectory, 'dir');
    sinon.assert.calledOnce(mockInit.run);
  });

  it('hlx init directory is optional', () => {
    new CLI()
      .withCommandExecutor('init', mockInit)
      .run(['init', 'name']);

    sinon.assert.calledWith(mockInit.withName, 'name');
    sinon.assert.calledWith(mockInit.withDirectory, '.');
    sinon.assert.calledOnce(mockInit.run);
  });

  it('hlx init fails with no name', (done) => {
    new CLI()
      .withCommandExecutor('init', mockInit)
      .onFail((err) => {
        assert.equal(err, 'Not enough non-option arguments: got 0, need at least 1');
        done();
      })
      .run(['init']);

    assert.fail('init w/o arguments should fail.');
  });
});
