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
const assert = require('assert');
const CLI = require('../src/cli.js');
const PerfCommand = require('../src/perf.cmd');

describe('hlx perf (CLI)', () => {
  // mocked command instance
  let mockPerf;
  let processenv = {};

  beforeEach(() => {
    // save environment
    processenv = Object.assign({}, process.env);
    // clear environment
    Object.keys(process.env).filter(key => key.match(/^HLX_.*/)).map((key) => {
      delete process.env[key];
      return true;
    });

    mockPerf = sinon.createStubInstance(PerfCommand);
    mockPerf.run.returnsThis();
    mockPerf.withCalibreAuth.returnsThis();
    mockPerf.withConnection.returnsThis();
    mockPerf.withLocation.returnsThis();
    mockPerf.withDevice.returnsThis();
    mockPerf.withJunit.returnsThis();
  });


  afterEach(() => {
    // restore environment
    Object.keys(processenv).filter(key => key.match(/^HLX_.*/)).map((key) => {
      process.env[key] = processenv[key];
      return true;
    });
  });

  it('hlx perf required auth', (done) => {
    new CLI()
      .withCommandExecutor('perf', mockPerf)
      .onFail((err) => {
        assert.equal(err, 'Missing required argument: calibre-auth');
        done();
      })
      .run(['perf']);
  });

  it('hlx perf accepts HLX_CALIBRE_AUTH', () => {
    process.env.HLX_CALIBRE_AUTH = 'nope-nope-nope';
    new CLI()
      .withCommandExecutor('perf', mockPerf)
      .onFail((err) => {
        assert.fail(err);
      })
      .run(['perf']);
    assert.ok(true);
  });

  it('hlx perf works with minimal arguments', () => {
    new CLI()
      .withCommandExecutor('perf', mockPerf)
      .run(['perf', '--calibre-auth', 'nope-nope-nope']);
    sinon.assert.calledOnce(mockPerf.run);
    sinon.assert.calledWith(mockPerf.withJunit, '');
  });

  it('hlx perf works with all arguments', () => {
    new CLI()
      .withCommandExecutor('perf', mockPerf)
      .run(['perf',
        '--calibre-auth', 'nope-nope-nope',
        '--location', 'California',
        '--device', 'iPad',
        '--connection', 'cable',
        '--junit', 'test-results.xml']);
    sinon.assert.calledWith(mockPerf.withDevice, 'iPad');
    sinon.assert.calledWith(mockPerf.withLocation, 'California');
    sinon.assert.calledWith(mockPerf.withConnection, 'cable');
    sinon.assert.calledWith(mockPerf.withJunit, 'test-results.xml');

    sinon.assert.calledOnce(mockPerf.run);
  });
});
