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

const assert = require('assert');
const nock = require('nock');
const path = require('path');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const { logging } = require('@adobe/helix-testutils');
const { clearHelixEnv } = require('./utils.js');

describe('hlx publish --remote (default)', () => {
  let RemotePublishCommand;
  let writeDictItem;
  let purgeAll;
  let softPurgeKey;
  let deleted;

  beforeEach('Setting up Fake Server', function bef() {
    deleted = clearHelixEnv();
    this.timeout(5000);
    writeDictItem = sinon.fake.resolves(true);
    purgeAll = sinon.fake.resolves(true);
    softPurgeKey = sinon.fake.resolves(true);

    RemotePublishCommand = proxyquire('../src/remotepublish.cmd', {
      '@adobe/fastly-native-promises': () => ({
        transact: (fn) => fn(3),
        writeDictItem,
        purgeAll,
        softPurgeKey,
      }),
    });

    // ensure to reset nock to avoid conflicts with PollyJS
    nock.restore();
    nock.cleanAll();
    nock.activate();
  });

  it('publishing makes HTTP requests', async () => {
    const scope = nock('https://adobeioruntime.net')
      .post('/api/v1/web/helix/helix-services/publish@v2')
      .reply(200, {})
      .post('/api/v1/web/helix/helix-services/logging@v1')
      .reply(200, {});

    const remote = await new RemotePublishCommand()
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withAlgoliaAppID('fake_id')
      .withAlgoliaAPIKey('fake_key')
      .withEpsagonAppName('fake_id')
      .withEpsagonToken('fake_key')
      .withCoralogixAppName('fake_id')
      .withCoralogixToken('fake_key')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v2')
      .withDebugKey('something')
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withFilter()
      .withDryRun(false);
    await remote.run();

    sinon.assert.callCount(writeDictItem, 6);
    sinon.assert.calledOnce(softPurgeKey);

    scope.done();
  });

  it('publishing sends expected parameters', async () => {
    let publishBody;
    const scope = nock('https://adobeioruntime.net')
      .post('/api/v1/web/helix/helix-services/publish@v7', (body) => {
        assert.equal(body.algoliaappid, 'fake_id');
        assert.equal(body.indexconfig.indices['blog-posts'].source, 'html');
        publishBody = body;
        return true;
      })
      .reply(200, {})
      .post('/api/v1/web/helix/helix-services/logging@v1')
      .reply(200, {});

    const remote = await new RemotePublishCommand()
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withAlgoliaAppID('fake_id')
      .withAlgoliaAPIKey('fake_key')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v7')
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withIndexConfigFile(path.resolve(__dirname, 'fixtures/helix-index.yaml'))
      .withFilter()
      .withDryRun(false);
    await remote.run();

    assert.ok(publishBody);
    assert.equal(publishBody.service, 'fake_name');
    assert.equal(publishBody.token, 'fake_auth');
    assert.equal(typeof (publishBody.configuration), 'object');
    assert.ok(Array.isArray(publishBody.configuration.strains));
    assert.equal(publishBody.configuration.strains.length, 4);
    assert.equal(publishBody.vcl, undefined);

    scope.done();
  });

  it('publishing stops of no strains with package info', async () => {
    const remote = await new RemotePublishCommand()
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v2')
      .withConfigFile(path.resolve(__dirname, 'fixtures/non-deployed.yaml'))
      .withDryRun(false);
    await remote.run();

    sinon.assert.notCalled(writeDictItem);
    sinon.assert.notCalled(purgeAll);
  });

  it('publishing warns if remote logging fails', async () => {
    const scope = nock('https://adobeioruntime.net')
      .post('/api/v1/web/helix/helix-services/publish@v2')
      .reply(200, {});

    const logger = logging.createTestLogger();
    const remote = await new RemotePublishCommand(logger)
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v2')
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withFilter()
      .withDryRun(false);
    await remote.run();

    sinon.assert.callCount(writeDictItem, 4);
    sinon.assert.calledOnce(softPurgeKey);

    const log = logger.getOutput();
    assert.ok(/Remote addlogger service failed/.test(log));

    scope.done();
  });

  afterEach(() => {
    clearHelixEnv();
    // restore env
    Object.keys(deleted).forEach((key) => {
      process.env[key] = deleted[key];
    });

    nock.restore();
  });
});
