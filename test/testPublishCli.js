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
const dotenv = require('dotenv');
const path = require('path');
const { clearHelixEnv } = require('./utils.js');
const CLI = require('../src/cli.js');
const RemotePublishCommand = require('../src/remotepublish.cmd.js');

describe('hlx publish', () => {
  // mocked command instance
  let mockPublish;
  let deleted;

  beforeEach(() => {
    deleted = clearHelixEnv();
    mockPublish = sinon.createStubInstance(RemotePublishCommand);
    mockPublish.withWskHost.returnsThis();
    mockPublish.withWskAuth.returnsThis();
    mockPublish.withWskNamespace.returnsThis();
    mockPublish.withFastlyNamespace.returnsThis();
    mockPublish.withFastlyAuth.returnsThis();
    mockPublish.withDryRun.returnsThis();
    mockPublish.withPublishAPI.returnsThis();
    mockPublish.withConfigPurgeAPI.returnsThis();
    mockPublish.withUpdateBotConfig.returnsThis();
    mockPublish.withGithubToken.returnsThis();
    mockPublish.withFilter.returnsThis();
    mockPublish.withCustomVCLs.returnsThis();
    mockPublish.withDispatchVersion.returnsThis();
    mockPublish.withPurge.returnsThis();
    mockPublish.withDebugKey.returnsThis();
    mockPublish.withAlgoliaAPIKey.returnsThis();
    mockPublish.withAlgoliaAppID.returnsThis();
    mockPublish.run.returnsThis();
  });

  afterEach(() => {
    clearHelixEnv();
    // restore env
    Object.keys(deleted).forEach((key) => {
      process.env[key] = deleted[key];
    });
  });

  it('hlx publish requires auth', (done) => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .onFail((err) => {
        assert.ok(!err || err.indexOf('required'));
        done();
      })
      .run(['publish']);

    assert.fail('publish w/o arguments should fail.');
  });

  it('hlx publish can use env', () => {
    dotenv.config({ path: path.resolve(__dirname, 'fixtures', 'all.env') });
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .run(['publish']);
    sinon.assert.calledWith(mockPublish.withWskHost, 'myruntime.net');
    sinon.assert.calledWith(mockPublish.withWskAuth, 'foobar');
    sinon.assert.calledWith(mockPublish.withWskNamespace, '1234');
    sinon.assert.calledWith(mockPublish.withFastlyNamespace, '1234');
    sinon.assert.calledWith(mockPublish.withFastlyAuth, 'foobar');
    sinon.assert.calledWith(mockPublish.withPublishAPI, 'foobar.api');
    sinon.assert.calledWith(mockPublish.withDryRun, true);
    sinon.assert.calledWith(mockPublish.withCustomVCLs, []);
    sinon.assert.calledWith(mockPublish.withDispatchVersion, undefined);
  });

  it('hlx publish works with minimal arguments', () => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-namespace', 'hlx',
        '--purge', 'hard',
      ]);

    sinon.assert.calledWith(mockPublish.withWskHost, 'adobeioruntime.net');
    sinon.assert.calledWith(mockPublish.withWskAuth, 'secret-key');
    sinon.assert.calledWith(mockPublish.withWskNamespace, 'hlx');
    sinon.assert.calledWith(mockPublish.withFastlyNamespace, 'hlx'); // TODO !!
    sinon.assert.calledWith(mockPublish.withFastlyAuth, 'secret-key');
    sinon.assert.calledWith(mockPublish.withCustomVCLs, []);
    sinon.assert.calledWith(mockPublish.withDispatchVersion, undefined);
    sinon.assert.calledWith(mockPublish.withPurge, 'hard');
    sinon.assert.calledOnce(mockPublish.run);
  });

  it('hlx publish handles serviceid', () => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-serviceid', 'hlx',
      ]);

    sinon.assert.calledWith(mockPublish.withFastlyNamespace, 'hlx');
  });

  it('hlx publish implicit bot config with github token', () => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-namespace', 'hlx',
        '--github-token', 'foobar',
      ]);

    sinon.assert.calledWith(mockPublish.withUpdateBotConfig, true);
    sinon.assert.calledWith(mockPublish.withGithubToken, 'foobar');
    sinon.assert.calledWith(mockPublish.withConfigPurgeAPI, 'https://app.project-helix.io/config/purge');
    sinon.assert.calledOnce(mockPublish.run);
  });

  it('hlx publish implicit bot config with github token with serviceid', () => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-serviceid', 'hlx',
        '--github-token', 'foobar',
      ]);

    sinon.assert.calledWith(mockPublish.withUpdateBotConfig, true);
    sinon.assert.calledWith(mockPublish.withGithubToken, 'foobar');
    sinon.assert.calledWith(mockPublish.withConfigPurgeAPI, 'https://app.project-helix.io/config/purge');
    sinon.assert.calledOnce(mockPublish.run);
  });

  it('hlx publish handles github token', () => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-serviceid', 'hlx',
        '--github-token', 'foobar',
      ]);

    sinon.assert.calledWith(mockPublish.withGithubToken, 'foobar');
  });

  it('hlx publish requires github token for update config', (done) => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .onFail((err) => {
        assert.ok(err.indexOf('required'));
        done();
      })
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-namespace', 'hlx',
        '--update-bot-config',
      ]);

    assert.fail('publish w/o github token should fail.');
  });

  it('hlx publish requires github token for update config with serviceid', (done) => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .onFail((err) => {
        assert.ok(err.indexOf('required'));
        done();
      })
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-serviceid', 'hlx',
        '--update-bot-config',
      ]);

    assert.fail('publish w/o github token should fail.');
  });

  it('hlx publish handles dispatch-version', () => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-namespace', 'hlx',
        '--dispatch-version', 'ci1',
      ]);

    sinon.assert.calledWith(mockPublish.withDispatchVersion, 'ci1');
  });

  it('hlx publish handles fastly-serviceid', () => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-serviceid', 'hlx',
      ]);

    sinon.assert.calledWith(mockPublish.withFastlyNamespace, 'hlx');
  });

  it('hlx publish fails with empty fastly-serviceid', (done) => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .onFail((err) => {
        assert.ok(!err || err.indexOf('required'));
        done();
      })
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-serviceid', '',
      ]);

    sinon.assert.fail('hlx publish should fail with empty fastly-serviceid');
  });

  it('hlx publish fails with empty fastly-auth', (done) => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .onFail((err) => {
        assert.ok(!err || err.indexOf('required'));
        done();
      })
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', '',
        '--fastly-serviceid', 'hlx',
      ]);

    sinon.assert.fail('hlx publish should fail with empty fastly-auth');
  });

  it('hlx publish fails with empty wsk-namespace', (done) => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .onFail((err) => {
        assert.ok(!err || err.indexOf('required'));
        done();
      })
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', '',
        '--fastly-auth', 'secret-key',
        '--fastly-serviceid', 'hlx',
      ]);

    sinon.assert.fail('hlx publish should fail with empty wsk-namespace');
  });

  it('hlx publish fails with empty wsk-auth', (done) => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .onFail((err) => {
        assert.ok(!err || err.indexOf('required'));
        done();
      })
      .run(['publish',
        '--wsk-auth', '',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-serviceid', 'hlx',
      ]);

    sinon.assert.fail('hlx publish should fail with empty wsk-auth');
  });

  it('hlx publish handles debug-key', () => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-namespace', 'hlx',
        '--dispatch-version', 'ci1',
        '--debug-key', 'something',
      ]);

    sinon.assert.calledWith(mockPublish.withDebugKey, 'something');
  });
});
