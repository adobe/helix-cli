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
process.env.HELIX_FETCH_FORCE_HTTP1 = 'true';

const sinon = require('sinon');
const dotenv = require('dotenv');
const path = require('path');
const { clearHelixEnv } = require('./utils.js');
const CLI = require('../src/cli.js');
const CleanCommand = require('../src/clean.cmd');

describe('hlx clean', () => {
  // mocked command instance
  let mockClean;
  let deleted;

  beforeEach(() => {
    deleted = clearHelixEnv();
    mockClean = sinon.createStubInstance(CleanCommand);
    mockClean.withTargetDir.returnsThis();
    mockClean.run.returnsThis();
  });

  afterEach(() => {
    clearHelixEnv();
    // restore env
    Object.keys(deleted).forEach((key) => {
      process.env[key] = deleted[key];
    });
  });

  it('hlx clean runs w/o arguments', () => {
    new CLI()
      .withCommandExecutor('clean', mockClean)
      .run(['clean']);
    sinon.assert.calledWith(mockClean.withTargetDir, '.hlx/build');
    sinon.assert.calledOnce(mockClean.run);
  });

  it('hlx clean can use env', () => {
    dotenv.config({ path: path.resolve(__dirname, 'fixtures', 'all.env') });
    new CLI()
      .withCommandExecutor('clean', mockClean)
      .run(['clean']);
    sinon.assert.calledWith(mockClean.withTargetDir, 'foo');
    sinon.assert.calledOnce(mockClean.run);
  });

  it('hlx clean can set target', () => {
    new CLI()
      .withCommandExecutor('clean', mockClean)
      .run(['clean', '--target', 'tmp/build']);
    sinon.assert.calledWith(mockClean.withTargetDir, 'tmp/build');
    sinon.assert.calledOnce(mockClean.run);
  });
});
