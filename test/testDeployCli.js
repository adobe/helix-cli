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
    mockDeploy.withWskHost.returnsThis();
    mockDeploy.withWskAuth.returnsThis();
    mockDeploy.withWskNamespace.returnsThis();
    mockDeploy.withLogglyHost.returnsThis();
    mockDeploy.withLogglyAuth.returnsThis();
    mockDeploy.withTarget.returnsThis();
    mockDeploy.withDocker.returnsThis();
    mockDeploy.withPrefix.returnsThis();
    mockDeploy.withDefault.returnsThis();
    mockDeploy.withEnableDirty.returnsThis();
    mockDeploy.withDryRun.returnsThis();
    mockDeploy.withContent.returnsThis();
    mockDeploy.withStaticContent.returnsThis();
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
        assert.equal(err, `Missing required arguments: wsk-namespace, wsk-auth
OpenWhisk Namespace is required
Authentication is required. You can pass the key via the HLX_WSK_AUTH environment variable, too`);
        done();
      })
      .run(['deploy']);

    assert.fail('deploy w/o arguments should fail.');
  });

  it('hlx deploy requires namespace', (done) => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .onFail((err) => {
        assert.equal(err, `Missing required arguments: wsk-namespace, wsk-auth
OpenWhisk Namespace is required
Authentication is required. You can pass the key via the HLX_WSK_AUTH environment variable, too`);
        done();
      })
      .run(['deploy', '--wsk-auth secret-key']);

    assert.fail('deploy w/o arguments should fail.');
  });

  it('hlx deploy works with minimal arguments', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
      ]);

    sinon.assert.calledWith(mockDeploy.withEnableAuto, true);
    sinon.assert.calledWith(mockDeploy.withEnableDirty, false);
    sinon.assert.calledWith(mockDeploy.withWskHost, 'runtime.adobe.io');
    sinon.assert.calledWith(mockDeploy.withWskAuth, 'secret-key');
    sinon.assert.calledWith(mockDeploy.withWskNamespace, 'hlx');
    sinon.assert.calledWith(mockDeploy.withLogglyHost, 'trieloff.loggly.com'); // TODO !!
    sinon.assert.calledWith(mockDeploy.withLogglyAuth, '');
    sinon.assert.calledWith(mockDeploy.withTarget, '.hlx/build');
    sinon.assert.calledWith(mockDeploy.withDocker, 'trieloff/custom-ow-nodejs8:latest');
    sinon.assert.calledWith(mockDeploy.withPrefix, 'git-github-com-example-project-helix--master--');
    sinon.assert.calledWith(mockDeploy.withDefault, undefined);
    sinon.assert.calledWith(mockDeploy.withStaticContent, 'bundled');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy works with arguments provided in environment', () => {
    process.env.HLX_WSK_AUTH = 'sekret-key';
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-namespace', 'hlx',
      ]);

    sinon.assert.calledWith(mockDeploy.withEnableAuto, true);
    sinon.assert.calledWith(mockDeploy.withEnableDirty, false);
    sinon.assert.calledWith(mockDeploy.withWskHost, 'runtime.adobe.io');
    sinon.assert.calledWith(mockDeploy.withWskAuth, 'sekret-key');
    sinon.assert.calledWith(mockDeploy.withWskNamespace, 'hlx');
    sinon.assert.calledWith(mockDeploy.withLogglyHost, 'trieloff.loggly.com'); // TODO !!
    sinon.assert.calledWith(mockDeploy.withLogglyAuth, '');
    sinon.assert.calledWith(mockDeploy.withTarget, '.hlx/build');
    sinon.assert.calledWith(mockDeploy.withDocker, 'trieloff/custom-ow-nodejs8:latest');
    sinon.assert.calledWith(mockDeploy.withPrefix, 'git-github-com-example-project-helix--master--');
    sinon.assert.calledWith(mockDeploy.withDefault, undefined);
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy tolerates unknown env parameters', () => {
    process.env.HLX_FOOBAR = '1234';
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
      ]);
  });

  it('hlx deploy can disable auto', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--no-auto',
      ]);

    sinon.assert.calledWith(mockDeploy.withEnableAuto, false);
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy works can enable dirty', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--dirty',
      ]);

    sinon.assert.calledWith(mockDeploy.withEnableDirty, true);
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set api host', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--wsk-host', 'stage.runtime.adobe.io',
      ]);

    sinon.assert.calledWith(mockDeploy.withWskHost, 'stage.runtime.adobe.io');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set log host and key', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--loggly-host', 'example.logly.com',
        '--loggly-auth', 'some-secret-logger-key',
      ]);

    sinon.assert.calledWith(mockDeploy.withLogglyHost, 'example.logly.com');
    sinon.assert.calledWith(mockDeploy.withLogglyAuth, 'some-secret-logger-key');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set set target', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--target', 'tmp/build',
      ]);

    sinon.assert.calledWith(mockDeploy.withTarget, 'tmp/build');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set set target with -o', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '-o', 'tmp/build',
      ]);

    sinon.assert.calledWith(mockDeploy.withTarget, 'tmp/build');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set set docker', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--docker', 'example/node8:latest',
      ]);

    sinon.assert.calledWith(mockDeploy.withDocker, 'example/node8:latest');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set prefix', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--prefix', '_hlx_',
      ]);

    sinon.assert.calledWith(mockDeploy.withPrefix, '_hlx_');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set default', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--default', 'FEATURE', 'red, green',
      ]);

    sinon.assert.calledWith(mockDeploy.withDefault, { FEATURE: 'red, green' });
    sinon.assert.calledOnce(mockDeploy.run);
  });

  ['none', 'S3', 'azure', 'bundled', 'codeload', 'github'].forEach((mode) => {
    it(`hlx deploy can set static content: ${mode}`, () => {
      new CLI()
        .withCommandExecutor('deploy', mockDeploy)
        .run(['deploy',
          '--wsk-auth', 'secret-key',
          '--wsk-namespace', 'hlx',
          '--static-content', mode,
        ]);

      sinon.assert.calledWith(mockDeploy.withStaticContent, mode);
      sinon.assert.calledOnce(mockDeploy.run);
    });
  });

  it('hlx deploy rejects unsupported static content', (done) => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .onFail(() => {
        done();
      })
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--static-content', 'foobar',
      ]);
    assert.fail('hlx deploy with unsupported static content should fail');
  });
});
