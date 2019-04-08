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

const sinon = require('sinon');
const dotenv = require('dotenv');
const path = require('path');
const { clearHelixEnv } = require('./utils.js');
const CLI = require('../src/cli.js');
const PerfCommand = require('../src/perf.cmd');

describe('hlx perf (CLI)', () => {
  // mocked command instance
  let mockPerf;

  beforeEach(() => {
    clearHelixEnv();
    mockPerf = sinon.createStubInstance(PerfCommand);
    mockPerf.run.returnsThis();
    mockPerf.withConnection.returnsThis();
    mockPerf.withFastlyAuth.returnsThis();
    mockPerf.withFastlyNamespace.returnsThis();
    mockPerf.withLocation.returnsThis();
    mockPerf.withDevice.returnsThis();
    mockPerf.withJunit.returnsThis();
  });

  afterEach(() => {
    clearHelixEnv();
  });

  it('hlx perf can use env', () => {
    dotenv.config({ path: path.resolve(__dirname, 'fixtures', 'all.env') });
    new CLI()
      .withCommandExecutor('perf', mockPerf)
      .run(['perf']);
    sinon.assert.calledWith(mockPerf.withDevice, 'iPad');
    sinon.assert.calledWith(mockPerf.withLocation, 'California');
    sinon.assert.calledWith(mockPerf.withConnection, 'good2G');
    sinon.assert.calledWith(mockPerf.withJunit, 'some-results.xml');
    sinon.assert.calledWith(mockPerf.withFastlyAuth, 'foobar');
    sinon.assert.calledWith(mockPerf.withFastlyNamespace, '1234');
    sinon.assert.calledOnce(mockPerf.run);
  });

  it('hlx perf works with minimal arguments', () => {
    new CLI()
      .withCommandExecutor('perf', mockPerf)
      .run(['perf', '--fastly-auth', 'nope-nope-nope', '--fastly-namespace', 'nope-nope-nope']);
    sinon.assert.calledOnce(mockPerf.run);
    sinon.assert.calledWith(mockPerf.withJunit, '');
  });

  it('hlx perf works with all arguments', () => {
    new CLI()
      .withCommandExecutor('perf', mockPerf)
      .run(['perf',
        '--fastly-auth', 'nope-nope-nope',
        '--fastly-namespace', 'nope-nope-nope',
        '--location', 'California',
        '--device', 'iPad',
        '--connection', 'cable',
        '--junit', 'test-results.xml']);
    sinon.assert.calledWith(mockPerf.withDevice, 'iPad');
    sinon.assert.calledWith(mockPerf.withLocation, 'California');
    sinon.assert.calledWith(mockPerf.withConnection, 'cable');
    sinon.assert.calledWith(mockPerf.withJunit, 'test-results.xml');
    sinon.assert.calledWith(mockPerf.withFastlyAuth, 'nope-nope-nope');
    sinon.assert.calledWith(mockPerf.withFastlyNamespace, 'nope-nope-nope');

    sinon.assert.calledOnce(mockPerf.run);
  });
});
