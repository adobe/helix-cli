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
const { AssertionError } = require('assert');
const nock = require('nock');
const path = require('path');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const { clearHelixEnv } = require('./utils.js');

describe('hlx publish --remote (fail prepare service config)', () => {
  let scope;
  let RemotePublishCommand;
  let writeDictItem;
  let purgeAll;
  let discard;
  let deleted;

  before('Setting up Fake Server', function bef() {
    deleted = clearHelixEnv();
    this.timeout(5000);
    writeDictItem = sinon.fake.resolves(true);
    purgeAll = sinon.fake.resolves(true);
    discard = sinon.fake.resolves(true);

    RemotePublishCommand = proxyquire('../src/remotepublish.cmd', {
      '@adobe/fastly-native-promises': () => ({
        transact: (fn) => fn(3),
        writeDictItem,
        purgeAll,
        discard,
      }),
    });

    // ensure to reset nock to avoid conflicts with PollyJS
    nock.restore();
    nock.cleanAll();
    nock.activate();

    scope = nock('https://helix-pages.anywhere.run')
      .post('/helix-services/publish@v8')
      .reply(400, {});
  });

  it('publishing makes HTTP requests', async () => {
    const remote = await new RemotePublishCommand()
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withDryRun(false);

    try {
      await remote.run();
      assert.fail();
    } catch (e) {
      if (e instanceof AssertionError) {
        assert.fail(e);
      }
      sinon.assert.notCalled(writeDictItem);
      sinon.assert.notCalled(purgeAll);
    }
  });

  after(() => {
    clearHelixEnv();
    // restore env
    Object.keys(deleted).forEach((key) => {
      process.env[key] = deleted[key];
    });

    scope.done();
    nock.restore();
  });
});
