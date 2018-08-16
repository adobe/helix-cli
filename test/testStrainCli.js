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
const CLI = require('../src/cli.js');
const StrainCommand = require('../src/strain.cmd');

describe('hlx strain', () => {
  // mocked command instance
  let mockStrain;
  let processenv = {};

  beforeEach(() => {
    // save environment
    processenv = Object.assign({}, process.env);
    // clear environment
    Object.keys(process.env).filter(key => key.match(/^HLX_.*/)).map((key) => {
      delete process.env[key];
      return true;
    });

    mockStrain = sinon.createStubInstance(StrainCommand);
    mockStrain.withWskHost.returnsThis();
    mockStrain.withWskAuth.returnsThis();
    mockStrain.withWskNamespace.returnsThis();
    mockStrain.withFastlyNamespace.returnsThis();
    mockStrain.withFastlyAuth.returnsThis();
    mockStrain.withDryRun.returnsThis();
    mockStrain.run.returnsThis();
  });

  afterEach(() => {
    // restore environment
    Object.keys(processenv).filter(key => key.match(/^HLX_.*/)).map((key) => {
      process.env[key] = processenv[key];
      return true;
    });
  });

  it('hlx strain requires auth', (done) => {
    new CLI()
      .withCommandExecutor('strain', mockStrain)
      .onFail((err) => {
        assert.ok(err.indexOf('required'));
        done();
      })
      .run(['strain']);

    assert.fail('strain w/o arguments should fail.');
  });

  it('hlx strain works with minimal arguments', () => {
    new CLI()
      .withCommandExecutor('strain', mockStrain)
      .run(['strain',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-namespace', 'hlx',
      ]);

    sinon.assert.calledWith(mockStrain.withWskHost, 'runtime.adobe.io');
    sinon.assert.calledWith(mockStrain.withWskAuth, 'secret-key');
    sinon.assert.calledWith(mockStrain.withWskNamespace, 'hlx');
    sinon.assert.calledWith(mockStrain.withFastlyNamespace, 'hlx'); // TODO !!
    sinon.assert.calledWith(mockStrain.withFastlyAuth, 'secret-key');
    sinon.assert.calledOnce(mockStrain.run);
  });
});
