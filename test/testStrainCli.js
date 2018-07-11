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

/* env: mocha */

'use strict';

const assert = require('assert');
const sinon = require('sinon');
const CLI = require('../src/cli.js');
const StrainCommand = require('../src/strain.cmd');

describe('hlx strain', () => {
  // mocked command instance
  let mockStrain;
  let stubs;

  beforeEach(() => {
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
    stubs.forEach((s) => { s.restore(); });
  });

  it('hlx strain required auth', (done) => {
    new CLI()
      .withCommandExecutor('strain', mockStrain)
      .onFail((err) => {
        assert.equal(err, 'Missing required arguments: wsk-namespace, wsk-auth\n'
          + 'Authentication is required. You can pass the key via the HLX_WSK_AUTH environment variable, too');
        done();
      })
      .run(['strain']);

    assert.fail('strain w/o arguments should fail.');
  });

  it('hlx strain requires namespace', (done) => {
    new CLI()
      .withCommandExecutor('strain', mockStrain)
      .onFail((err) => {
        assert.equal(err, 'Missing required arguments: wsk-namespace, wsk-auth\n'
          + 'Authentication is required. You can pass the key via the HLX_WSK_AUTH environment variable, too');
        done();
      })
      .run(['strain', '--wsk-auth secret-key']);

    assert.fail('strain w/o arguments should fail.');
  });

  it('hlx strain works with minimal arguments', () => {
    new CLI()
      .withCommandExecutor('strain', mockStrain)
      .run(['strain',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
      ]);

    sinon.assert.calledWith(mockStrain.withEnableAuto, true);
    sinon.assert.calledWith(mockStrain.withEnableDirty, false);
    sinon.assert.calledWith(mockStrain.withWskHost, 'runtime.adobe.io');
    sinon.assert.calledWith(mockStrain.withWskAuth, 'secret-key');
    sinon.assert.calledWith(mockStrain.withWskNamespace, 'hlx');
    sinon.assert.calledWith(mockStrain.withLogglyHost, 'trieloff.loggly.com'); // TODO !!
    sinon.assert.calledWith(mockStrain.withLogglyAuth, '');
    sinon.assert.calledWith(mockStrain.withTarget, '.hlx/build');
    sinon.assert.calledWith(mockStrain.withDocker, 'trieloff/custom-ow-nodejs8:latest');
    sinon.assert.calledWith(mockStrain.withPrefix, 'git-github-com-example-project-helix--master--');
    sinon.assert.calledWith(mockStrain.withDefault, undefined);
    sinon.assert.calledOnce(mockStrain.run);
  });

  it('hlx deploy can set api host', () => {
    new CLI()
      .withCommandExecutor('deploy', mockStrain)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--wsk-host', 'stage.runtime.adobe.io',
      ]);

    sinon.assert.calledWith(mockStrain.withWskHost, 'stage.runtime.adobe.io');
    sinon.assert.calledOnce(mockStrain.run);
  });

});
