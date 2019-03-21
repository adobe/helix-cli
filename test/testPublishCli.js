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
const PublishCommand = require('../src/publish.cmd');

describe('hlx publish', () => {
  // mocked command instance
  let mockPublish;
  let processenv = {};

  beforeEach(() => {
    // save environment
    processenv = Object.assign({}, process.env);
    // clear environment
    Object.keys(process.env).filter(key => key.match(/^HLX_.*/)).map((key) => {
      delete process.env[key];
      return true;
    });

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
    // restore environment
    Object.keys(processenv).filter(key => key.match(/^HLX_.*/)).map((key) => {
      process.env[key] = processenv[key];
      return true;
    });
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
