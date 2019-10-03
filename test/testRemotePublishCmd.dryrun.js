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

const path = require('path');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const { setupMocha: setupPolly } = require('@pollyjs/core');
const { clearHelixEnv } = require('./utils.js');

describe('hlx publish --remote --dry-run (default)', () => {
  let RemotePublishCommand;
  let writeDictItem;
  let purgeAll;

  before('Setting up Fake Server', function bef() {
    clearHelixEnv();
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
  });

  setupPolly({
    adapters: [NodeHttpAdapter],
  });

  it('publishing makes HTTP requests', async function test() {
    const { server } = this.polly;
    server.post('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v2').intercept((req, res) => res.sendStatus(200).json({}));
    server.post('https://adobeioruntime.net/api/v1/web/helix/helix-services/logging@v1').intercept((req, res) => res.sendStatus(200).json({}));

    const remote = await new RemotePublishCommand()
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withDryRun(true);
    await remote.run();

    sinon.assert.callCount(writeDictItem, 4);
    sinon.assert.notCalled(purgeAll);
  });
});
