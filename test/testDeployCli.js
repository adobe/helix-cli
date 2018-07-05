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

/* global describe, it, beforeEach, afterEach */

'use strict';

const assert = require('assert');
const sinon = require('sinon');
const CLI = require('../src/cli.js');
const DeployCommand = require('../src/deploy.cmd');

describe('hlx deploy', () => {
  // mocked command instance
  let mockDeploy;
  let stubs;

  beforeEach(() => {
    mockDeploy = sinon.createStubInstance(DeployCommand);
    mockDeploy.withEnableAuto.returnsThis();
    mockDeploy.withApihost.returnsThis();
    mockDeploy.withApikey.returnsThis();
    mockDeploy.withNamespace.returnsThis();
    mockDeploy.withLoghost.returnsThis();
    mockDeploy.withLogkey.returnsThis();
    mockDeploy.withTarget.returnsThis();
    mockDeploy.withDocker.returnsThis();
    mockDeploy.withPrefix.returnsThis();
    mockDeploy.withDefault.returnsThis();
    mockDeploy.withEnableDirty.returnsThis();
    mockDeploy.run.returnsThis();

    // disable static functions as well to avoid shelljs executions.
    stubs = [
      sinon.stub(DeployCommand, 'isDirty').returns(false),
      sinon.stub(DeployCommand, 'getRepository').returns('git-github-com-example-project-helix'),
      sinon.stub(DeployCommand, 'getBranchFlag').returns('master'),
    ];
  });

  afterEach(() => {
    stubs.forEach((s) => { s.restore(); });
  });

  it('hlx deploy required auth', (done) => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .onFail((err) => {
        assert.equal(err, 'Missing required arguments: namespace, auth\n' +
          'Authentication is required. You can pass the key via the HLX_AUTH environment variable, too');
        done();
      })
      .run(['deploy']);

    assert.fail('deploy w/o arguments should fail.');
  });

  it('hlx deploy requires namespace', (done) => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .onFail((err) => {
        assert.equal(err, 'Missing required arguments: namespace, auth\n' +
          'Authentication is required. You can pass the key via the HLX_AUTH environment variable, too');
        done();
      })
      .run(['deploy', '--auth secret-key']);

    assert.fail('deploy w/o arguments should fail.');
  });
  it('hlx deploy works with minimal arguments', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--auth', 'secret-key',
        '--namespace', 'hlx',
      ]);

    sinon.assert.calledWith(mockDeploy.withEnableAuto, true);
    sinon.assert.calledWith(mockDeploy.withEnableDirty, false);
    sinon.assert.calledWith(mockDeploy.withApihost, 'runtime.adobe.io');
    sinon.assert.calledWith(mockDeploy.withApikey, 'secret-key');
    sinon.assert.calledWith(mockDeploy.withNamespace, 'hlx');
    sinon.assert.calledWith(mockDeploy.withLoghost, 'trieloff.loggly.com'); // TODO !!
    sinon.assert.calledWith(mockDeploy.withLogkey, '');
    sinon.assert.calledWith(mockDeploy.withTarget, '.hlx/build');
    sinon.assert.calledWith(mockDeploy.withDocker, 'trieloff/custom-ow-nodejs8:latest');
    sinon.assert.calledWith(mockDeploy.withPrefix, 'git-github-com-example-project-helix--master--');
    sinon.assert.calledWith(mockDeploy.withDefault, undefined);
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy works can disable auto', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--auth', 'secret-key',
        '--namespace', 'hlx',
        '--no-auto',
      ]);

    sinon.assert.calledWith(mockDeploy.withEnableAuto, false);
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy works can enable dirty', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--auth', 'secret-key',
        '--namespace', 'hlx',
        '--dirty',
      ]);

    sinon.assert.calledWith(mockDeploy.withEnableDirty, true);
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set api host', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--auth', 'secret-key',
        '--namespace', 'hlx',
        '--apihost', 'stage.runtime.adobe.io',
      ]);

    sinon.assert.calledWith(mockDeploy.withApihost, 'stage.runtime.adobe.io');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set log host and key', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--auth', 'secret-key',
        '--namespace', 'hlx',
        '--loghost', 'example.logly.com',
        '--logkey', 'some-secret-logger-key',
      ]);

    sinon.assert.calledWith(mockDeploy.withLoghost, 'example.logly.com');
    sinon.assert.calledWith(mockDeploy.withLogkey, 'some-secret-logger-key');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set set target', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--auth', 'secret-key',
        '--namespace', 'hlx',
        '--target', 'tmp/build',
      ]);

    sinon.assert.calledWith(mockDeploy.withTarget, 'tmp/build');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set set target with -o', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--auth', 'secret-key',
        '--namespace', 'hlx',
        '-o', 'tmp/build',
      ]);

    sinon.assert.calledWith(mockDeploy.withTarget, 'tmp/build');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set set docker', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--auth', 'secret-key',
        '--namespace', 'hlx',
        '--docker', 'example/node8:latest',
      ]);

    sinon.assert.calledWith(mockDeploy.withDocker, 'example/node8:latest');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set prefix', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--auth', 'secret-key',
        '--namespace', 'hlx',
        '--prefix', '_hlx_',
      ]);

    sinon.assert.calledWith(mockDeploy.withPrefix, '_hlx_');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set default', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--auth', 'secret-key',
        '--namespace', 'hlx',
        '--default', 'FEATURE', 'red, green',
      ]);

    sinon.assert.calledWith(mockDeploy.withDefault, { FEATURE: 'red, green' });
    sinon.assert.calledOnce(mockDeploy.run);
  });
});
