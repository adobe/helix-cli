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
const fs = require('fs-extra');
const nock = require('nock');
const path = require('path');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const shell = require('shelljs');
const { Logger } = require('@adobe/helix-shared');
const { createTestRoot } = require('./utils.js');

const RemotePublishCommand = require('../src/remotepublish.cmd');

describe('hlx publish --dispatch-version (check params)', () => {
  it('hlx publish (no dispatch-version)', () => {
    const remote = new RemotePublishCommand()
      .withDispatchVersion();

    // eslint-disable-next-line no-underscore-dangle
    assert.equal(remote._dispatchVersion, null);
  });

  it('hlx publish --dispatch-version ci1', async () => {
    const remote = new RemotePublishCommand()
      .withDispatchVersion('ci1');

    // eslint-disable-next-line no-underscore-dangle
    assert.deepEqual(remote._dispatchVersion, 'ci1');
  });
});

describe('hlx publish --custom-vcl (check requests)', () => {
  let ProxiedRemotePublishCommand;
  let writeDictItem;
  let purgeAll;
  let testRoot;
  let pwd;
  let dispatchVersion;
  let scope;
  let remote;

  beforeEach('Setting up Fake Server', async function bef() {
    this.timeout(5000);
    writeDictItem = sinon.fake.resolves(true);
    purgeAll = sinon.fake.resolves(true);

    ProxiedRemotePublishCommand = proxyquire('../src/remotepublish.cmd', {
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
      .post('/api/v1/web/helix/helix-services/publish@v2', (body) => {
        ({ dispatchVersion } = body);
        return true;
      })
      .reply(200, {})
      .post('/api/v1/web/helix/helix-services/logging@v1')
      .reply(200, {});

    // set up a fake git repo.
    testRoot = await createTestRoot();
    await fs.copy(path.resolve(__dirname, 'fixtures/filtered-master.yaml'), path.resolve(testRoot, 'helix-config.yaml'));

    // throw a Javascript error when any shell.js command encounters an error
    shell.config.fatal = true;

    // init git repo
    pwd = shell.pwd();
    shell.cd(testRoot);
    shell.exec('git init');
    shell.exec('git add -A');
    shell.exec('git commit -m"initial commit."');

    // set up command
    const logger = Logger.getTestLogger();
    remote = await new ProxiedRemotePublishCommand(logger)
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v2')
      .withConfigFile(path.resolve(__dirname, 'fixtures/filtered.yaml'))
      .withDryRun(false);
  });

  it('hlx publish (no dispatch-version)', async () => {
    await remote.run();
    assert.equal(dispatchVersion, null);
  });

  it('hlx publish --dispatch-version ci1', async () => {
    remote.withDispatchVersion('ci1');
    await remote.run();

    assert.equal(dispatchVersion, 'ci1');
  });

  afterEach(async () => {
    scope.done();
    nock.restore();
    shell.cd(pwd);
    await fs.remove(testRoot);
  });
});
