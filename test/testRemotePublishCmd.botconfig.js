/*
 * Copyright 2019 Adobe. All rights reserved.
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
const nock = require('nock');
const path = require('path');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const assert = require('assert');
const { logging } = require('@adobe/helix-testutils');
const { clearHelixEnv } = require('./utils.js');

process.env.HELIX_FETCH_FORCE_HTTP1 = true;

const EXPECTED_BODY = {
  content_repositories: [
    'ssh://github.com/adobe/helix-cli.git#master',
    'ssh://github.com/adobe/helix-content.git#master',
  ],
  fastly_service_id: 'fake_name',
  fastly_token: 'fake_auth',
  github_token: 'github-token-foobar',
};

describe('hlx publish --remote (default)', () => {
  let scope;
  let RemotePublishCommand;
  let writeDictItem;
  let purgeAll;
  let deleted;

  beforeEach('Setting up Fake Server', function bef() {
    deleted = clearHelixEnv();
    this.timeout(5000);
    writeDictItem = sinon.fake.resolves(true);
    purgeAll = sinon.fake.resolves(true);

    RemotePublishCommand = proxyquire('../src/remotepublish.cmd', {
      '@adobe/fastly-native-promises': () => ({
        transact: (fn) => fn(3),
        writeDictItem,
        purgeAll,
      }),
    });

    // ensure to reset nock to avoid conflicts with PollyJS
    nock.restore();
    nock.cleanAll();
    nock.activate();

    scope = nock('https://adobeioruntime.net')
      .post('/api/v1/web/helix/helix-services/publish@v2')
      .reply(200, {})
      .post('/api/v1/web/helix/helix-services/logging@v1')
      .reply(200, {});
  });

  it('publishing updates bot config', async () => {
    const scopeBot = nock('https://app.project-helix.io')
      .post('/config/purge')
      .reply((uri, requestBody) => {
        assert.deepEqual(requestBody, EXPECTED_BODY);
        return [
          200,
          JSON.stringify({
            'adobe/helix-cli#master': {
              key: 'adobe/helix-cli#master',
              ref: 'master',
              owner: 'adobe',
              repo: 'helix-cli',
              installation_id: 863255,
              id: 142561818,
              config: {
                version: '1.0',
                branch: 'master',
                caches: [
                  {
                    fastlyServiceId: 'fake_name',
                    domains: [
                      'app-dev.project-helix.io',
                      'app-tripod.project-helix.io',
                    ],
                    fastlyToken: '*',
                  },
                ],
              },
            },
            'adobe/helix-content#master': {
              key: 'adobe/helix-content#master',
              ref: 'master',
              owner: 'adobe',
              repo: 'helix-content',
              installation_id: 863255,
              id: 142561818,
              config: {
                version: '1.0',
                branch: 'master',
                caches: [
                  {
                    fastlyServiceId: 'fake_name',
                    domains: [
                      'app-dev.project-helix.io',
                      'app-tripod.project-helix.io',
                    ],
                    fastlyToken: '*',
                  },
                ],
              },
            },
          }),
          { 'content-type': 'application/json' },
        ];
      });
    const logger = logging.createTestLogger();
    const remote = await new RemotePublishCommand(logger)
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v2')
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withUpdateBotConfig(true)
      .withGithubToken('github-token-foobar')
      .withConfigPurgeAPI('https://app.project-helix.io/config/purge')
      .withPurge('hard')
      .withDryRun(false);
    await remote.run();

    sinon.assert.callCount(writeDictItem, 4);
    sinon.assert.calledOnce(purgeAll);

    const log = logger.getOutput();
    const idx0 = log.indexOf('Updated the purge-configuration of the following repositories');
    const idx1 = log.indexOf('The purge-configuration of following repositories were not updated due to errors');
    const idx2 = log.indexOf('The following repositories are referenced by strains but don\'t have the helix-bot setup');
    const idx3 = log.indexOf('adobe/helix-cli#master');
    assert.ok(idx0 > 0, 'update message');
    assert.ok(idx1 < 0, 'error message');
    assert.ok(idx2 < 0, 'bot setup message');
    assert.ok(idx3 > idx0);
    scopeBot.done();
  });

  it('publishing update bot config complains if no bot installed', async () => {
    const scopeBot = nock('https://app.project-helix.io')
      .post('/config/purge')
      .reply((uri, requestBody) => {
        assert.deepEqual(requestBody, EXPECTED_BODY);
        return [
          200,
          JSON.stringify({
            'adobe/helix-cli#master': {
              key: 'adobe/helix-cli#master',
              ref: 'master',
              owner: 'tripodsan',
              repo: 'hlxtest',
            },
            'adobe/helix-content#master': {
              key: 'adobe/helix-cli#master',
              ref: 'master',
              owner: 'tripodsan',
              repo: 'hlxtest',
            },
          }),
          { 'content-type': 'application/json' },
        ];
      });
    const logger = logging.createTestLogger();
    const remote = await new RemotePublishCommand(logger)
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v2')
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withUpdateBotConfig(true)
      .withGithubToken('github-token-foobar')
      .withPurge('hard')
      .withDryRun(false);
    await remote.run();

    sinon.assert.callCount(writeDictItem, 4);
    sinon.assert.calledOnce(purgeAll);

    const log = logger.getOutput();
    const idx0 = log.indexOf('Updated the purge-configuration of the following repositories');
    const idx1 = log.indexOf('The purge-configuration of following repositories were not updated due to errors');
    const idx2 = log.indexOf('The following repositories are referenced by strains but don\'t have the helix-bot setup');
    const idx3 = log.indexOf('adobe/helix-cli#master');
    assert.ok(idx0 < 0, 'update message');
    assert.ok(idx1 < 0, 'error message');
    assert.ok(idx2 > 0, 'bot setup message');
    assert.ok(idx3 > idx2);
    scopeBot.done();
  });

  it('publishing update bot config reports error if incomplete response', async () => {
    const scopeBot = nock('https://app.project-helix.io')
      .post('/config/purge')
      .reply((uri, requestBody) => {
        assert.deepEqual(requestBody, EXPECTED_BODY);
        return [
          200,
          JSON.stringify({
          }),
          { 'content-type': 'application/json' },
        ];
      });
    const logger = logging.createTestLogger();
    const remote = await new RemotePublishCommand(logger)
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v2')
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withUpdateBotConfig(true)
      .withGithubToken('github-token-foobar')
      .withPurge('hard')
      .withDryRun(false);
    await remote.run();

    sinon.assert.callCount(writeDictItem, 4);
    sinon.assert.calledOnce(purgeAll);

    const log = logger.getOutput();
    const idx0 = log.indexOf('Updated the purge-configuration of the following repositories');
    const idx1 = log.indexOf('The purge-configuration of following repositories were not updated due to errors');
    const idx2 = log.indexOf('The following repositories are referenced by strains but don\'t have the helix-bot setup');
    const idx3 = log.lastIndexOf('adobe/helix-cli#master');
    assert.ok(idx0 < 0, 'update message');
    assert.ok(idx1 > 0, 'error message');
    assert.ok(idx2 < 0, 'bot setup message');
    assert.ok(idx3 > idx1);
    assert.ok(log.indexOf('Internal error: adobe/helix-cli#master should be in the service response') > 0);
    scopeBot.done();
  });

  it('publishing update bot config reports error if fastly service is not in response', async () => {
    const scopeBot = nock('https://app.project-helix.io')
      .post('/config/purge')
      .reply((uri, requestBody) => {
        assert.deepEqual(requestBody, EXPECTED_BODY);
        return [
          200,
          JSON.stringify({
            'adobe/helix-cli#master': {
              key: 'adobe/helix-cli#master',
              ref: 'master',
              owner: 'tripodsan',
              repo: 'hlxtest',
              installation_id: 863255,
              id: 142561818,
              config: {
                version: '1.0',
                branch: 'master',
                caches: [
                  {
                    fastlyServiceId: 'anotherid',
                    fastlyToken: '*',
                  },
                ],
              },
            },
          }),
          { 'content-type': 'application/json' },
        ];
      });
    const logger = logging.createTestLogger();
    const remote = await new RemotePublishCommand(logger)
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v2')
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withUpdateBotConfig(true)
      .withGithubToken('github-token-foobar')
      .withPurge('hard')
      .withDryRun(false);
    await remote.run();

    sinon.assert.callCount(writeDictItem, 4);
    sinon.assert.calledOnce(purgeAll);

    const log = logger.getOutput();
    const idx0 = log.indexOf('Updated the purge-configuration of the following repositories');
    const idx1 = log.indexOf('The purge-configuration of following repositories were not updated due to errors');
    const idx2 = log.indexOf('The following repositories are referenced by strains but don\'t have the helix-bot setup');
    const idx3 = log.lastIndexOf('adobe/helix-cli#master');
    assert.ok(idx0 < 0, 'update message');
    assert.ok(idx1 > 0, 'error message');
    assert.ok(idx2 < 0, 'bot setup message');
    assert.ok(idx3 > idx1);
    assert.ok(log.indexOf('Internal error: adobe/helix-cli#master status does have a configuration entry for given fastly service id.') > 0);
    scopeBot.done();
  });

  it('publishing with bad github_token fails with err message', async () => {
    const scopeBot = nock('https://app.project-helix.io')
      .post('/config/purge')
      .reply((uri, requestBody) => {
        assert.deepEqual(requestBody, EXPECTED_BODY);
        return [
          403,
          JSON.stringify({
            statusCode: 403,
            error: Error(),
          }),
        ];
      });
    const logger = logging.createTestLogger();
    const remote = await new RemotePublishCommand(logger)
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v2')
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withUpdateBotConfig(true)
      .withGithubToken('github-token-foobar')
      .withDryRun(false);

    try {
      assert.fail(await remote.run());
    } catch (err) {
      assert.equal(
        "Error while running the Publish command:The provided GITHUB_TOKEN is not authorized to act on behalf of the Helix Bot and can therefore not be used to update the purge config. You can generate a new token by running 'hlx auth'",
        err.message.replace(/[\n\r]+/g, ''),
      );
      scopeBot.done();
    }
  });

  it('publishing update bot config reports error if fastly service has error', async () => {
    const scopeBot = nock('https://app.project-helix.io')
      .post('/config/purge')
      .reply((uri, requestBody) => {
        assert.deepEqual(requestBody, EXPECTED_BODY);
        return [
          200,
          JSON.stringify({
            'adobe/helix-cli#master': {
              key: 'adobe/helix-cli#master',
              ref: 'master',
              owner: 'tripodsan',
              repo: 'hlxtest',
              installation_id: 863255,
              id: 142561818,
            },
          }),
          { 'content-type': 'application/json' },
        ];
      });
    const logger = logging.createTestLogger();
    const remote = await new RemotePublishCommand(logger)
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v2')
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withUpdateBotConfig(true)
      .withGithubToken('github-token-foobar')
      .withPurge('hard')
      .withDryRun(false);
    await remote.run();

    sinon.assert.callCount(writeDictItem, 4);
    sinon.assert.calledOnce(purgeAll);

    const log = logger.getOutput();

    const idx0 = log.indexOf('Updated the purge-configuration of the following repositories');
    const idx1 = log.indexOf('The purge-configuration of following repositories were not updated due to errors');
    const idx2 = log.indexOf('The following repositories are referenced by strains but don\'t have the helix-bot setup');
    const idx3 = log.lastIndexOf('adobe/helix-cli#master');
    assert.ok(idx0 < 0, 'update message');
    assert.ok(idx1 > 0, 'error message');
    assert.ok(idx2 < 0, 'bot setup message');
    assert.ok(idx3 > idx1);
    assert.ok(log.indexOf(' Internal error: adobe/helix-cli#master status does not have configuration details.') > 0);
    scopeBot.done();
  });

  it('publishing update bot config reports error if config is missing', async () => {
    const scopeBot = nock('https://app.project-helix.io')
      .post('/config/purge')
      .reply((uri, requestBody) => {
        assert.deepEqual(requestBody, EXPECTED_BODY);
        return [
          200,
          JSON.stringify({
            'adobe/helix-cli#master': {
              key: 'adobe/helix-cli#master',
              ref: 'master',
              owner: 'tripodsan',
              repo: 'hlxtest',
              installation_id: 863255,
              id: 142561818,
              errors: [
                'errors with config',
              ],
            },
            'adobe/helix-content#master': {
              key: 'adobe/helix-content#master',
              ref: 'master',
              owner: 'adobe',
              repo: 'helix-content',
              installation_id: 863255,
              id: 142561818,
              config: {
                version: '1.0',
                branch: 'master',
                caches: [
                  {
                    fastlyServiceId: 'fake_name',
                    errors: [
                      '400 error with service',
                    ],
                  },
                ],
              },
            },
          }),
          { 'content-type': 'application/json' },
        ];
      });
    const logger = logging.createTestLogger();
    const remote = await new RemotePublishCommand(logger)
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v2')
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withUpdateBotConfig(true)
      .withGithubToken('github-token-foobar')
      .withPurge('hard')
      .withDryRun(false);
    await remote.run();

    sinon.assert.callCount(writeDictItem, 4);
    sinon.assert.calledOnce(purgeAll);

    const log = logger.getOutput();

    const idx0 = log.indexOf('Updated the purge-configuration of the following repositories');
    const idx1 = log.indexOf('The purge-configuration of following repositories were not updated due to errors');
    const idx2 = log.indexOf('The following repositories are referenced by strains but don\'t have the helix-bot setup');
    const idx3 = log.lastIndexOf('adobe/helix-cli#master');
    assert.ok(idx0 < 0, 'update message');
    assert.ok(idx1 > 0, 'error message');
    assert.ok(idx2 < 0, 'bot setup message');
    assert.ok(idx3 > idx1);
    assert.ok(log.indexOf('adobe/helix-cli#master update failed: errors with config') > 0);
    assert.ok(log.indexOf('adobe/helix-content#master update failed for given fastly service id: 400 error with service') > 0);
    scopeBot.done();
  });

  afterEach(() => {
    clearHelixEnv();
    // restore env
    Object.keys(deleted).forEach((key) => {
      process.env[key] = deleted[key];
    });

    scope.done();
    nock.restore();
  });
});
