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

const nock = require('nock');
const path = require('path');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const shell = require('shelljs');
const fse = require('fs-extra');
const assert = require('assert');
const { createTestRoot } = require('./utils.js');
const { makeLogger } = require('../src/log-common');

describe('hlx publish --remote (with filters)', () => {
  let RemotePublishCommand;
  let writeDictItem;
  let purgeAll;
  let testRoot;
  let pwd;
  let publishedstrains;
  let scope;
  let remote;

  beforeEach('Setting up Fake Server', async function bef() {
    this.timeout(5000);
    writeDictItem = sinon.fake.resolves(true);
    purgeAll = sinon.fake.resolves(true);

    RemotePublishCommand = proxyquire('../src/remotepublish.cmd', {
      '@adobe/fastly-native-promises': () => ({
        transact: fn => fn(3),
        writeDictItem,
        purgeAll,
      }),
    });


    // ensure to reset nock to avoid conflicts with PollyJS
    nock.restore();
    nock.cleanAll();
    nock.activate();

    scope = nock('https://adobeioruntime.net')
      .post('/api/v1/web/helix/helix-services/publish@v1', (body) => {
        publishedstrains = body.configuration.strains.reduce((o, strain) => {
          if (strain.origin) {
            // eslint-disable-next-line no-param-reassign
            o[strain.name] = strain.origin.hostname === 'www.adobe.io' ? 'branch' : 'master';
          }
          if (strain.package) {
            // eslint-disable-next-line no-param-reassign
            o[strain.name] = strain.package;
          }
          return o;
        }, {});
        return true;
      })
      .reply(200, {})
      .post('/api/v1/web/helix/default/addlogger')
      .reply(200, {});

    // set up a fake git repo.
    testRoot = await createTestRoot();
    await fse.copy(path.resolve(__dirname, 'fixtures/filtered-master.yaml'), path.resolve(testRoot, 'helix-config.yaml'));

    // throw a Javascript error when any shell.js command encounters an error
    shell.config.fatal = true;

    // init git repo
    pwd = shell.pwd();
    shell.cd(testRoot);
    shell.exec('git init');
    shell.exec('git add -A');
    shell.exec('git commit -m"initial commit."');

    // set up command
    remote = await new RemotePublishCommand(makeLogger({ logLevel: 'debug' }))
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v1')
      .withConfigFile(path.resolve(__dirname, 'fixtures/filtered.yaml'))
      .withDryRun(false);
  });

  it('publishing without filters takes everything from branch', async () => {
    await remote.run();

    assert.deepEqual(publishedstrains, {
      default: 'branch',
      'both-api': 'branch',
      'branch-foo': 'branch',
      'branch-bar': 'branch',
      'only-branch': 'branch',
    });
  });

  it('publishing with only selects from branch', async () => {
    remote = remote.withFilter('branch-*', undefined);
    await remote.run();

    assert.deepEqual(publishedstrains, {
      default: 'master',
      'both-api': 'master',
      'branch-foo': 'branch',
      'branch-bar': 'branch',
      'master-foo': 'master',
      'master-bar': 'master',
      'only-master': 'master',
    });
  });

  it('publishing with exclude selects from master', async () => {
    remote = remote.withFilter(undefined, 'branch-*');
    await remote.run();

    assert.deepEqual(publishedstrains, {
      default: 'branch',
      'both-api': 'branch',
      'master-foo': 'master',
      'master-bar': 'master',
      'only-master': 'master',
      'only-branch': 'branch',
    });
  });


  afterEach(async () => {
    scope.done();
    nock.restore();
    shell.cd(pwd);
    await fse.remove(testRoot);
  });
});

describe('hlx publish --remote (with filters, but without config)', () => {
  let RemotePublishCommand;
  let writeDictItem;
  let purgeAll;
  let testRoot;
  let pwd;
  let publishedstrains;
  let remote;

  beforeEach('Setting up Fake Server', async function bef() {
    this.timeout(5000);
    writeDictItem = sinon.fake.resolves(true);
    purgeAll = sinon.fake.resolves(true);

    RemotePublishCommand = proxyquire('../src/remotepublish.cmd', {
      '@adobe/fastly-native-promises': () => ({
        transact: fn => fn(3),
        writeDictItem,
        purgeAll,
      }),
    });


    // ensure to reset nock to avoid conflicts with PollyJS
    nock.restore();
    nock.cleanAll();
    nock.activate();

    nock('https://adobeioruntime.net')
      .post('/api/v1/web/helix/helix-services/publish@v1', (body) => {
        publishedstrains = body.configuration.strains.reduce((o, strain) => {
          if (strain.origin) {
            // eslint-disable-next-line no-param-reassign
            o[strain.name] = strain.origin.hostname === 'www.adobe.io' ? 'branch' : 'master';
          }
          if (strain.package) {
            // eslint-disable-next-line no-param-reassign
            o[strain.name] = strain.package;
          }
          return o;
        }, {});
        return true;
      })
      .reply(200, {})
      .post('/api/v1/web/helix/default/addlogger')
      .reply(200, {});

    // set up a fake git repo.
    testRoot = await createTestRoot();
    await fse.copy(path.resolve(__dirname, 'fixtures/filtered-master.yaml'), path.resolve(testRoot, 'wrong-helix-config.yaml'));

    // throw a Javascript error when any shell.js command encounters an error
    shell.config.fatal = true;

    // init git repo
    pwd = shell.pwd();
    shell.cd(testRoot);
    shell.exec('git init');
    shell.exec('git add -A');
    shell.exec('git commit -m"initial commit."');

    // set up command
    remote = await new RemotePublishCommand(makeLogger({ logLevel: 'debug' }))
      .withWskAuth('fakeauth')
      .withWskNamespace('fakename')
      .withFastlyAuth('fake_auth')
      .withFastlyNamespace('fake_name')
      .withWskHost('doesn.t.matter')
      .withPublishAPI('https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v1')
      .withConfigFile(path.resolve(__dirname, 'fixtures/filtered.yaml'))
      .withDryRun(false);
  });

  it('publishing without filters takes everything from branch', async () => {
    await remote.run();

    assert.deepEqual(publishedstrains, {
      default: 'branch',
      'both-api': 'branch',
      'branch-foo': 'branch',
      'branch-bar': 'branch',
      'only-branch': 'branch',
    });
  });

  it('publishing with only fails', async () => {
    remote = remote.withFilter('branch-*', undefined);
    try {
      await remote.run();
      assert.fail('this should fail');
    } catch (e) {
      if (e instanceof assert.AssertionError) {
        throw e;
      }
      assert.equal(e.message, 'Error while running the Publish command');
    }
  });

  it('publishing with exclude fails', async () => {
    remote = remote.withFilter(undefined, 'branch-*');
    try {
      await remote.run();
      assert.fail('this should fail');
    } catch (e) {
      if (e instanceof assert.AssertionError) {
        throw e;
      }
      assert.equal(e.message, 'Error while running the Publish command');
    }
  });


  afterEach(async () => {
    nock.restore();
    shell.cd(pwd);
    await fse.remove(testRoot);
  });
});
