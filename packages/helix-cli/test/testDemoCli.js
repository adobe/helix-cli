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
const DemoCommand = require('../src/demo.cmd');

describe('hlx demo', () => {
  // mocked command instance
  let mockInit;

  beforeEach(() => {
    mockInit = sinon.createStubInstance(DemoCommand);
    mockInit.withDirectory.returnsThis();
    mockInit.withName.returnsThis();
    mockInit.withType.returnsThis();
    mockInit.run.returnsThis();
  });

  it('hlx demo accepts name and directory', () => {
    new CLI()
      .withCommandExecutor('demo', mockInit)
      .run(['demo', 'name', 'dir']);

    sinon.assert.calledWith(mockInit.withName, 'name');
    sinon.assert.calledWith(mockInit.withDirectory, 'dir');
    sinon.assert.calledOnce(mockInit.run);
  });

  it('hlx demo directory is optional', () => {
    new CLI()
      .withCommandExecutor('demo', mockInit)
      .run(['demo', 'name']);

    sinon.assert.calledWith(mockInit.withName, 'name');
    sinon.assert.calledWith(mockInit.withDirectory, '.');
    sinon.assert.calledOnce(mockInit.run);
  });

  it('hlx demo can set type: simple', () => {
    new CLI()
      .withCommandExecutor('demo', mockInit)
      .run(['demo', 'name', '--type', 'simple']);

    sinon.assert.calledWith(mockInit.withName, 'name');
    sinon.assert.calledWith(mockInit.withType, 'simple');
    sinon.assert.calledOnce(mockInit.run);
  });

  it('hlx demo can set type: full', () => {
    new CLI()
      .withCommandExecutor('demo', mockInit)
      .run(['demo', 'name', '--type', 'full']);

    sinon.assert.calledWith(mockInit.withName, 'name');
    sinon.assert.calledWith(mockInit.withType, 'full');
    sinon.assert.calledOnce(mockInit.run);
  });

  it('hlx demo fails with no name', (done) => {
    new CLI()
      .withCommandExecutor('demo', mockInit)
      .onFail((err) => {
        assert.equal(err, 'Not enough non-option arguments: got 0, need at least 1');
        done();
      })
      .run(['demo']);

    assert.fail('demo w/o arguments should fail.');
  });

  it('hlx demo fails with wrong type', (done) => {
    new CLI()
      .withCommandExecutor('demo', mockInit)
      .onFail((err) => {
        assert.equal(err, 'Invalid values:\n  Argument: type, Given: "foo", Choices: "simple", "full"');
        done();
      })
      .run(['demo', 'name', '--type', 'foo']);

    assert.fail('demo with wrong type should fail.');
  });
});
