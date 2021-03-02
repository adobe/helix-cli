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

const assert = require('assert');
const sinon = require('sinon');
const dotenv = require('dotenv');
const path = require('path');
const { clearHelixEnv } = require('./utils.js');
const GitUtils = require('../src/git-utils');
const CLI = require('../src/cli.js');
const DeployCommand = require('../src/deploy.cmd');

describe('hlx deploy', () => {
  // mocked command instance
  let mockDeploy;
  let stubs;
  let deleted;

  beforeEach(() => {
    deleted = clearHelixEnv();
    mockDeploy = sinon.createStubInstance(DeployCommand);
    mockDeploy.withEnableAuto.returnsThis();
    mockDeploy.withCircleciAuth.returnsThis();
    mockDeploy.withWskHost.returnsThis();
    mockDeploy.withWskAuth.returnsThis();
    mockDeploy.withWskNamespace.returnsThis();
    mockDeploy.withWskActionMemory.returnsThis();
    mockDeploy.withWskActionConcurrency.returnsThis();
    mockDeploy.withTarget.returnsThis();
    mockDeploy.withFiles.returnsThis();
    mockDeploy.withDefault.returnsThis();
    mockDeploy.withDefaultFile.returnsThis();
    mockDeploy.withEnableDirty.returnsThis();
    mockDeploy.withDryRun.returnsThis();
    mockDeploy.withFastlyAuth.returnsThis();
    mockDeploy.withFastlyNamespace.returnsThis();
    mockDeploy.withCreatePackages.returnsThis();
    mockDeploy.withAddStrain.returnsThis();
    mockDeploy.withMinify.returnsThis();
    mockDeploy.withResolveGitRefService.returnsThis();
    mockDeploy.withCustomPipeline.returnsThis();
    mockDeploy.withEpsagonAppName.returnsThis();
    mockDeploy.withEpsagonToken.returnsThis();
    mockDeploy.withCoralogixAppName.returnsThis();
    mockDeploy.withCoralogixToken.returnsThis();
    mockDeploy.withUpdatedAt.returnsThis();
    mockDeploy.withUpdatedBy.returnsThis();
    mockDeploy.run.returnsThis();

    // disable static functions as well to avoid shelljs executions.
    stubs = [
      sinon.stub(GitUtils, 'isDirty').returns(false),
      sinon.stub(GitUtils, 'getRepository').returns('git-github-com-example-project-helix'),
      sinon.stub(GitUtils, 'getBranchFlag').returns('master'),
    ];
  });

  afterEach(() => {
    clearHelixEnv();
    // restore env
    Object.keys(deleted).forEach((key) => {
      process.env[key] = deleted[key];
    });

    stubs.forEach((s) => {
      s.restore();
    });
  });

  it('hlx deploy required auth', (done) => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .onFail((err) => {
        assert.equal(err, `Missing required arguments: wsk-auth, wsk-namespace
Authentication is required. You can pass the key via the HLX_WSK_AUTH environment variable, too
OpenWhisk Namespace is required`);
        done();
      })
      .run(['deploy']);

    assert.fail('deploy w/o arguments should fail.');
  });

  it('hlx deploy requires namespace', (done) => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .onFail((err) => {
        assert.equal(err, `Missing required arguments: wsk-auth, wsk-namespace
Authentication is required. You can pass the key via the HLX_WSK_AUTH environment variable, too
OpenWhisk Namespace is required`);
        done();
      })
      .run(['deploy', '--wsk-auth secret-key']);

    assert.fail('deploy w/o arguments should fail.');
  });

  it('hlx deploy requires circleci auth', (done) => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .onFail((err) => {
        assert.equal(err, 'Error: Auto-deployment requires: --circleci-auth, --fastly-auth, --fastly-namespace');
        done();
      })
      .run(['deploy', '--auto', 'true',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx']);

    assert.fail('deploy w/o arguments should fail.');
  });

  it('hlx deploy works with minimal arguments', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
      ]);

    sinon.assert.calledWith(mockDeploy.withEnableAuto, false);
    sinon.assert.calledWith(mockDeploy.withEnableDirty, false);
    sinon.assert.calledWith(mockDeploy.withWskHost, 'adobeioruntime.net');
    sinon.assert.calledWith(mockDeploy.withWskAuth, 'secret-key');
    sinon.assert.calledWith(mockDeploy.withWskNamespace, 'hlx');
    sinon.assert.calledWith(mockDeploy.withFastlyAuth, undefined);
    sinon.assert.calledWith(mockDeploy.withFastlyNamespace, undefined);
    sinon.assert.calledWith(mockDeploy.withTarget, '.hlx/build');
    sinon.assert.calledWith(mockDeploy.withFiles, ['src/**/*.htl', 'src/**/*.js', 'src/**/*.jsx', 'cgi-bin/**/*.js']);
    sinon.assert.calledWith(mockDeploy.withDefault, {});
    sinon.assert.calledWith(mockDeploy.withCreatePackages, 'auto');
    sinon.assert.calledWith(mockDeploy.withCircleciAuth, '');
    sinon.assert.calledWith(mockDeploy.withDryRun, false);
    sinon.assert.calledWith(mockDeploy.withMinify, false);
    sinon.assert.calledWith(mockDeploy.withResolveGitRefService, 'helix-services/resolve-git-ref@v1');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy works with arguments provided in environment', () => {
    dotenv.config({ path: path.resolve(__dirname, 'fixtures', 'all.env') });
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy']);

    sinon.assert.calledWith(mockDeploy.withEnableAuto, true);
    sinon.assert.calledWith(mockDeploy.withEnableDirty, true);
    sinon.assert.calledWith(mockDeploy.withWskHost, 'myruntime.net');
    sinon.assert.calledWith(mockDeploy.withWskAuth, 'foobar');
    sinon.assert.calledWith(mockDeploy.withWskNamespace, '1234');
    sinon.assert.calledWith(mockDeploy.withFastlyAuth, 'foobar');
    sinon.assert.calledWith(mockDeploy.withFastlyNamespace, '1234');
    sinon.assert.calledWith(mockDeploy.withTarget, 'foo');
    sinon.assert.calledWith(mockDeploy.withFiles, ['*.htl', '*.js']);
    sinon.assert.calledWith(mockDeploy.withCircleciAuth, 'foobar');
    sinon.assert.calledWith(mockDeploy.withDryRun, true);
    sinon.assert.calledWith(mockDeploy.withMinify, true);
    sinon.assert.calledWith(mockDeploy.withResolveGitRefService, 'resolve.api');
    sinon.assert.calledWith(mockDeploy.withDefault, { SECRET2: 'VALUE2' });
    sinon.assert.calledOnce(mockDeploy.run);
    const cb = mockDeploy.withDefaultFile.getCall(0).firstArg;
    const defaults = cb(path.resolve(__dirname, 'integration'));
    assert.deepEqual(defaults, {
      MY_DEFAULT_1: 'default-value-1',
    });
  });

  it('hlx deploy fails with HLX_ADD env', () => {
    process.env.HLX_ADD = true;
    let failed = false;
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .onFail((e) => {
        failed = e;
      })
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
      ]);
    sinon.assert.calledOnce(mockDeploy.run);
    sinon.assert.match('HLX_ADD is not allowed in environment.', failed);
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

  it('hlx deploy can enable auto', (done) => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .onFail((err) => {
        assert.equal(err, 'Error: Auto-deployment requires: --circleci-auth, --fastly-auth, --fastly-namespace');
        done();
      })
      .run(['deploy', '--auto', 'true',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
      ]);

    sinon.assert.calledWith(mockDeploy.withEnableAuto, true);
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
        '--wsk-host', 'stage.adobeioruntime.net',
      ]);

    sinon.assert.calledWith(mockDeploy.withWskHost, 'stage.adobeioruntime.net');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set action limits', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--wsk-action-memory', '384',
        '--wsk-action-concurrency', '50',
      ]);

    sinon.assert.calledWith(mockDeploy.withWskActionMemory, 384);
    sinon.assert.calledWith(mockDeploy.withWskActionConcurrency, 50);
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set log host and key', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
      ]);

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

  it('hlx deploy can set package=ignore', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--package', 'ignore',
      ]);

    sinon.assert.calledWith(mockDeploy.withCreatePackages, 'ignore');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set package=always', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--package', 'always',
      ]);

    sinon.assert.calledWith(mockDeploy.withCreatePackages, 'always');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set package=auto', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--package', 'auto',
      ]);

    sinon.assert.calledWith(mockDeploy.withCreatePackages, 'auto');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can enable minify', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--minify',
      ]);

    sinon.assert.calledWith(mockDeploy.withMinify, true);
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can add strain', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--add', 'foo',
      ]);

    sinon.assert.calledWith(mockDeploy.withAddStrain, 'foo');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can add empty strain', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--add',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
      ]);

    sinon.assert.calledWith(mockDeploy.withAddStrain, '');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set the resolve api', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--svc-resolve-git-ref', 'helix-services/foobar',
      ]);

    sinon.assert.calledWith(mockDeploy.withResolveGitRefService, 'helix-services/foobar');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set specify files', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--files', 'lib/*.htl', 'index.htl',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
      ]);
    sinon.assert.calledWith(mockDeploy.withFiles, ['lib/*.htl', 'index.htl']);
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set specify files without option', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        'lib/*.htl', 'index.htl',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
      ]);
    sinon.assert.calledWith(mockDeploy.withFiles, ['lib/*.htl', 'index.htl']);
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy with --default-file fails for non-existent file', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--default-file', 'foo']);
    const cb = mockDeploy.withDefaultFile.getCall(0).firstArg;
    assert.throws(() => cb('.'), new Error('Specified param file does not exist: foo'));
  });

  it('hlx deploy with --default-file works', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--default-file', 'defaults.env', 'defaults.json']);
    const cb = mockDeploy.withDefaultFile.getCall(0).firstArg;
    const defaults = cb(path.resolve(__dirname, 'integration'));
    assert.deepEqual(defaults, {
      MY_DEFAULT_1: 'default-value-1',
      MY_DEFAULT_2: 'default-value-2',
    });
  });

  it('hlx deploy can set update timestamp', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--updated-at', '1234',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
      ]);
    sinon.assert.calledWith(mockDeploy.withUpdatedAt, '1234');
    sinon.assert.calledOnce(mockDeploy.run);
  });

  it('hlx deploy can set update user', () => {
    new CLI()
      .withCommandExecutor('deploy', mockDeploy)
      .run(['deploy',
        '--updated-by', 'me',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
      ]);
    sinon.assert.calledWith(mockDeploy.withUpdatedBy, 'me');
    sinon.assert.calledOnce(mockDeploy.run);
  });
});
