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
const PublishCommand = require('../src/publish.cmd');

describe('hlx publish', () => {
  // mocked command instance
  let mockPublish;

  beforeEach(() => {
    clearHelixEnv();
    mockPublish = sinon.createStubInstance(PublishCommand);
    mockPublish.withWskHost.returnsThis();
    mockPublish.withWskAuth.returnsThis();
    mockPublish.withWskNamespace.returnsThis();
    mockPublish.withFastlyNamespace.returnsThis();
    mockPublish.withFastlyAuth.returnsThis();
    mockPublish.withDryRun.returnsThis();
    mockPublish.withPublishAPI.returnsThis();
    mockPublish.run.returnsThis();
  });

  afterEach(() => {
    clearHelixEnv();
  });

  it('hlx publish requires auth', (done) => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .onFail((err) => {
        assert.ok(err.indexOf('required'));
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
  });

  it('hlx publish works with minimal arguments', () => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-namespace', 'hlx',
        '--remote', 'false',
      ]);

    sinon.assert.calledWith(mockPublish.withWskHost, 'adobeioruntime.net');
    sinon.assert.calledWith(mockPublish.withWskAuth, 'secret-key');
    sinon.assert.calledWith(mockPublish.withWskNamespace, 'hlx');
    sinon.assert.calledWith(mockPublish.withFastlyNamespace, 'hlx'); // TODO !!
    sinon.assert.calledWith(mockPublish.withFastlyAuth, 'secret-key');
    sinon.assert.calledOnce(mockPublish.run);
  });

  it('hlx publish works with remote arguments', () => {
    new CLI()
      .withCommandExecutor('publish', mockPublish)
      .run(['publish',
        '--wsk-auth', 'secret-key',
        '--wsk-namespace', 'hlx',
        '--fastly-auth', 'secret-key',
        '--fastly-namespace', 'hlx',
        '--remote', 'true',
      ]);

    sinon.assert.calledWith(mockPublish.withWskHost, 'adobeioruntime.net');
    sinon.assert.calledWith(mockPublish.withWskAuth, 'secret-key');
    sinon.assert.calledWith(mockPublish.withWskNamespace, 'hlx');
    sinon.assert.calledWith(mockPublish.withFastlyNamespace, 'hlx'); // TODO !!
    sinon.assert.calledWith(mockPublish.withFastlyAuth, 'secret-key');
    sinon.assert.calledWith(mockPublish.withPublishAPI, 'https://adobeioruntime.net/api/v1/web/helix/default/publish');
    sinon.assert.calledOnce(mockPublish.run);
  });
});
