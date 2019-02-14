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

const Replay = require('replay');
const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const { HelixConfig, Logger } = require('@adobe/helix-shared');
const { createTestRoot } = require('./utils.js');
const PublishCommand = require('../src/publish.cmd');

// disable replay for this test
Replay.mode = 'bloody';
Replay.fixtures = path.resolve(__dirname, 'fixtures');

let FASTLY_AUTH = '---';
const FASTLY_NAMESPACE = '1s45RKXKEjuo2s0GWrF391';
let WSK_AUTH = 'nope';
let WSK_NAMESPACE = '---';

// const SRC_STRAINS = path.resolve(__dirname, 'fixtures/strains.yaml');

describe('hlx strain #unit', () => {
  it('makeRegexp() #unit', () => {
    const globs1 = ['*.htl', '*.js'];
    assert.equal(PublishCommand.makeRegexp(globs1), '^.*\\.htl$|^.*\\.js$');

    const globs2 = ['test/**', 'test*.js'];
    assert.equal(PublishCommand.makeRegexp(globs2), '^test\\/.*$|^test.*\\.js$');
  });

  it('loadStrains() #unit', async () => {
    const cmd = new PublishCommand();
    await cmd.withConfigFile(path.resolve(__dirname, 'fixtures/proxystrains.yaml')).init();
    /* eslint-disable no-underscore-dangle */
    assert.ok(cmd._strains);
    assert.equal(cmd._strains.length, 3);
  });
});

describe('Dynamic Strain (VCL) generation', () => {
  it('getStrainResolutionVCL generates VLC for non-existing conditions strains', async () => {
    const strainfile = path.resolve(__dirname, 'fixtures/default.yaml');
    const config = await new HelixConfig().withConfigPath(strainfile).init();
    const mystrains = Array.from(config.strains.values());

    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/default.vcl')).toString();
    assert.equal(PublishCommand.getStrainResolutionVCL(mystrains), vclfile);
  });

  it('getStrainResolutionVCL generates VLC for simple conditions strains', async () => {
    const strainfile = path.resolve(__dirname, 'fixtures/simple-condition.yaml');
    const config = await new HelixConfig().withConfigPath(strainfile).init();
    const mystrains = Array.from(config.strains.values());

    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/simple-condition.vcl')).toString();
    // console.log(PublishCommand.getStrainResolutionVCL(strainfile));
    assert.equal(vclfile.trim(), PublishCommand.getStrainResolutionVCL(mystrains).trim());
  });

  it('getStrainResolutionVCL generates VLC for URL-based conditions', async () => {
    const strainfile = path.resolve(__dirname, 'fixtures/urls.yaml');
    const config = await new HelixConfig().withConfigPath(strainfile).init();
    const mystrains = Array.from(config.strains.values());

    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/urls.vcl')).toString();
    // console.log(PublishCommand.getStrainResolutionVCL(strainfile));
    assert.equal(vclfile.trim(), PublishCommand.getStrainResolutionVCL(mystrains).trim());
  });

  it('getStrainResolutionVCL generates VLC for proxy strains', async () => {
    const strainfile = path.resolve(__dirname, 'fixtures/proxystrains.yaml');
    const config = await new HelixConfig().withConfigPath(strainfile).init();
    const mystrains = Array.from(config.strains.values());

    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/proxystrains.vcl')).toString();
    assert.equal(vclfile.trim(), PublishCommand.getStrainResolutionVCL(mystrains).trim());
  });

  it('getStrainParametersVCL generates VLC', async () => {
    const strainfile = path.resolve(__dirname, 'fixtures/some-params.yaml');
    const config = await new HelixConfig().withConfigPath(strainfile).init();
    const mystrains = Array.from(config.strains.values());

    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/some-params.vcl')).toString();
    assert.equal(PublishCommand.getStrainParametersVCL(mystrains).trim(), vclfile.trim());
  });

  it('getStrainParametersVCL generates VLC with no default params', async () => {
    const strainfile = path.resolve(__dirname, 'fixtures/no-default-params.yaml');
    const config = await new HelixConfig().withConfigPath(strainfile).init();
    const mystrains = Array.from(config.strains.values());

    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/no-default-params.vcl')).toString();
    assert.equal(PublishCommand.getStrainParametersVCL(mystrains).trim(), vclfile.trim());
  });

  it('initFastly generates new backends for defined Proxies', async () => {
    const strainfile = path.resolve(__dirname, 'fixtures/proxystrains.yaml');
    const cmd = new PublishCommand(Logger.getTestLogger()).withConfigFile(strainfile);
    try {
      await cmd.init();
      await cmd.initFastly();
    } catch (e) {
      // we expect initFastly to fail
      assert.equal(e.statusCode, 401);
    }
    assert.equal(Object.keys(cmd._backends).length, 3);
    assert.ok(cmd._backends.Proxy1921681001f402);
  }).timeout(50000);
});

describe('hlx publish (Integration)', function suite() {
  this.timeout(50000);

  let replayheaders;
  let testRoot;

  beforeEach(async () => {
    // if you need to re-record the test:
    // - change the mode in the next line to `record`
    // - set the FASTLY_AUTH, WSK_AUTH and WSK_NAMESPACE environment vars
    // - change the FASTLY_NAMESPACE here in the code
    // - run `npm run record`
    // - commit the changes

    if (process.env.MODE === 'record') {
      ({ FASTLY_AUTH, WSK_AUTH, WSK_NAMESPACE } = process.env);
      if (!FASTLY_AUTH || !FASTLY_NAMESPACE || !WSK_AUTH || !WSK_NAMESPACE) {
        /* eslint-disable no-console */
        console.error('FASTLY_AUTH, WSK_AUTH, WSK_NAMESPACE environment vars');
        console.error('must be set to re-record test.');
        console.log(FASTLY_AUTH, FASTLY_NAMESPACE, WSK_AUTH, WSK_NAMESPACE);
        /* eslint-enable no-console */
        process.exit(1);
      }
      Replay.mode = 'record';
      fs.removeSync(path.resolve(__dirname, 'fixtures/api.fastly.com-443'));
    } else {
      Replay.mode = 'replay';
    }

    testRoot = await createTestRoot();
    await fs.copyFile(path.resolve(__dirname, 'fixtures', 'default.yaml'), path.resolve(testRoot, 'helix-config.yaml'));

    // don't record the authorization header
    replayheaders = Replay.headers;
    Replay.headers = Replay.headers.filter(e => new RegExp(e).toString() !== new RegExp(/^body/).toString());
  });

  afterEach(async () => {
    Replay.mode = 'bloody';
    Replay.headers = replayheaders;
  });

  it('Publish Strains on an existing Service Config', async () => {
    const cmd = new PublishCommand()
      .withDirectory(testRoot)
      .withFastlyAuth(FASTLY_AUTH)
      .withFastlyNamespace(FASTLY_NAMESPACE)
      .withWskHost('adobeioruntime.net')
      .withWskAuth(WSK_AUTH)
      .withWskNamespace(WSK_NAMESPACE);

    // current version must 1
    const beforeVersion = await cmd.getCurrentVersion();
    assert.equal(beforeVersion, 1);

    await cmd.run();

    // current version must be 2 now
    const afterVersion = await cmd.getCurrentVersion();
    assert.equal(afterVersion, 2);

    // VCL version can be computed and must contain X-Version and '<current version=2> |'
    const vclVersion = await cmd.getVersionVCLSection();
    assert.notEqual(vclVersion.indexOf('X-Version ='), -1);
    assert.notEqual(vclVersion.indexOf('req.http.X-Version + "; src=2; cli='), -1);
  });

  it('Invalid strains.yaml gets rejected', () => {
    const brokenstrains = path.resolve(__dirname, 'fixtures/broken.yaml');

    try {
      new PublishCommand()
        .withStrainFile(brokenstrains)
        .withFastlyAuth(FASTLY_AUTH)
        .withFastlyNamespace(FASTLY_NAMESPACE)
        .withWskHost('adobeioruntime.net')
        .withWskAuth(WSK_AUTH)
        .withWskNamespace(WSK_NAMESPACE);
      assert.fail('Broken strains should be rejected.');
    } catch (e) {
      assert.ok(e.message);
    }
  });
});
