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

'use strict';

const assert = require('assert');
const sinon = require('sinon');
const { clearHelixEnv } = require('./utils.js');
const CLI = require('../src/cli.js');
const DemoCommand = require('../src/demo.cmd');

describe('hlx demo', () => {
  // mocked command instance
  let mockDemo;

  beforeEach(() => {
    clearHelixEnv();
    mockDemo = sinon.createStubInstance(DemoCommand);
    mockDemo.withDirectory.returnsThis();
    mockDemo.withName.returnsThis();
    mockDemo.withType.returnsThis();
    mockDemo.run.returnsThis();
  });

  afterEach(() => {
    clearHelixEnv();
  });

  it('hlx demo accepts name and directory', () => {
    new CLI()
      .withCommandExecutor('demo', mockDemo)
      .run(['demo', 'name', 'dir']);

    sinon.assert.calledWith(mockDemo.withName, 'name');
    sinon.assert.calledWith(mockDemo.withDirectory, 'dir');
    sinon.assert.calledOnce(mockDemo.run);
  });

  it('hlx demo directory is optional', () => {
    new CLI()
      .withCommandExecutor('demo', mockDemo)
      .run(['demo', 'name']);

    sinon.assert.calledWith(mockDemo.withName, 'name');
    sinon.assert.calledWith(mockDemo.withDirectory, '.');
    sinon.assert.calledOnce(mockDemo.run);
  });

  it('hlx demo can set type: simple', () => {
    new CLI()
      .withCommandExecutor('demo', mockDemo)
      .run(['demo', 'name', '--type', 'simple']);

    sinon.assert.calledWith(mockDemo.withName, 'name');
    sinon.assert.calledWith(mockDemo.withType, 'simple');
    sinon.assert.calledOnce(mockDemo.run);
  });

  it('hlx demo can set type: full', () => {
    new CLI()
      .withCommandExecutor('demo', mockDemo)
      .run(['demo', 'name', '--type', 'full']);

    sinon.assert.calledWith(mockDemo.withName, 'name');
    sinon.assert.calledWith(mockDemo.withType, 'full');
    sinon.assert.calledOnce(mockDemo.run);
  });

  it('hlx demo fails with no name', (done) => {
    new CLI()
      .withCommandExecutor('demo', mockDemo)
      .onFail((err) => {
        assert.equal(err, 'Not enough non-option arguments: got 0, need at least 1');
        done();
      })
      .run(['demo']);

    assert.fail('demo w/o arguments should fail.');
  });

  it('hlx demo fails with HLX_NAME set', (done) => {
    process.env.HLX_NAME = 'foo';
    new CLI()
      .withCommandExecutor('demo', mockDemo)
      .onFail((err) => {
        assert.equal(err, 'Not enough non-option arguments: got 0, need at least 1');
        done();
      })
      .run(['demo']);

    assert.fail('demo w/o arguments should fail.');
  });

  it('hlx demo fails with wrong type', (done) => {
    new CLI()
      .withCommandExecutor('demo', mockDemo)
      .onFail((err) => {
        assert.equal(err, 'Invalid values:\n  Argument: type, Given: "foo", Choices: "simple", "full"');
        done();
      })
      .run(['demo', 'name', '--type', 'foo']);

    assert.fail('demo with wrong type should fail.');
  });
});
