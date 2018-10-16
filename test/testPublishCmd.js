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
const { createTestRoot } = require('./utils.js');
const PublishCommand = require('../src/publish.cmd');
const strainconfig = require('../src/strain-config-utils');

// disable replay for this test
Replay.mode = 'bloody';
Replay.fixtures = path.resolve(__dirname, 'fixtures');

const FASTLY_AUTH = '---';
const FASTLY_NAMESPACE = '4fO8LaVL7Xtza4ksTcItHW';
const WSK_AUTH = 'nope';
const WSK_NAMESPACE = '---';

const SRC_STRAINS = path.resolve(__dirname, 'fixtures/strains.yaml');

describe('hlx strain #unit', () => {
  it('makeRegexp() #unit', () => {
    const globs1 = ['*.htl', '*.js'];
    assert.equal(PublishCommand.makeRegexp(globs1), '^.*\\.htl$|^.*\\.js$');

    const globs2 = ['test/**', 'test*.js'];
    assert.equal(PublishCommand.makeRegexp(globs2), '^test\\/.*$|^test.*\\.js$');
  });
});

describe('Dynamic Strain (VCL) generation', () => {
  it('getStrainResolutionVCL generates VLC for empty strains', () => {
    const strainfile = strainconfig.load(fs.readFileSync(path.resolve(__dirname, 'fixtures/empty.yaml')));
    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/empty.vcl')).toString();
    assert.equal(vclfile, PublishCommand.getStrainResolutionVCL(strainfile));
  });

  it('getStrainResolutionVCL generates VLC for non-existing conditions strains', () => {
    const strainfile = strainconfig.load(fs.readFileSync(path.resolve(__dirname, 'fixtures/default.yaml')));
    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/default.vcl')).toString();
    assert.equal(vclfile, PublishCommand.getStrainResolutionVCL(strainfile));
  });

  it('getStrainResolutionVCL generates VLC for simple conditions strains', () => {
    const strainfile = strainconfig.load(fs.readFileSync(path.resolve(__dirname, 'fixtures/simple-condition.yaml')));
    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/simple-condition.vcl')).toString();
    // console.log(PublishCommand.getStrainResolutionVCL(strainfile));
    assert.equal(vclfile.trim(), PublishCommand.getStrainResolutionVCL(strainfile).trim());
  });

  it('getStrainResolutionVCL generates VLC for URL-based conditions', () => {
    const strainfile = strainconfig.load(fs.readFileSync(path.resolve(__dirname, 'fixtures/urls.yaml')));
    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/urls.vcl')).toString();
    // console.log(PublishCommand.getStrainResolutionVCL(strainfile));
    assert.equal(vclfile.trim(), PublishCommand.getStrainResolutionVCL(strainfile).trim());
  });
});

describe('Dynamic Version (VCL) generation', () => {
  it('Version VCL', () => {
    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/dynamic-version.vcl')).toString();
    assert.equal(vclfile.trim(), PublishCommand.getXVersionExtensionVCL('A', 'B', 'C').trim());
  });
});

describe('Dynamic Parameter (VCL) generation', () => {
  it('getStrainParametersVCL generates VLC for empty strains', () => {
    const strainfile = strainconfig.load(fs.readFileSync(path.resolve(__dirname, 'fixtures/empty.yaml')));
    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/empty-params.vcl')).toString();
    assert.equal(vclfile, PublishCommand.getStrainParametersVCL(strainfile));
  });

  it('getStrainParametersVCL generates VLC for default strain', () => {
    const strainfile = strainconfig.load(fs.readFileSync(path.resolve(__dirname, 'fixtures/default-params.yaml')));
    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/default-params.vcl')).toString();
    assert.equal(vclfile, PublishCommand.getStrainParametersVCL(strainfile));
  });

  it('getStrainParametersVCL generates VLC for all strains with params', () => {
    const strainfile = strainconfig.load(fs.readFileSync(path.resolve(__dirname, 'fixtures/some-params.yaml')));
    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/some-params.vcl')).toString();
    assert.equal(vclfile, PublishCommand.getStrainParametersVCL(strainfile));
  });

  it('getStrainParametersVCL generates VLC for all strains with params even without defaults', () => {
    const strainfile = strainconfig.load(fs.readFileSync(path.resolve(__dirname, 'fixtures/no-default-params.yaml')));
    const vclfile = fs.readFileSync(path.resolve(__dirname, 'fixtures/no-default-params.vcl')).toString();
    assert.equal(vclfile, PublishCommand.getStrainParametersVCL(strainfile));
  });
});

describe('hlx strain (Integration)', function suite() {
  this.timeout(10000);

  let hlxDir;
  let dstStrains;

  beforeEach(async () => {
    const testRoot = await createTestRoot();
    hlxDir = path.resolve(testRoot, '.hlx');
    dstStrains = path.resolve(hlxDir, 'strains.yaml');

    await fs.mkdirp(hlxDir);
    await fs.copyFile(SRC_STRAINS, dstStrains);
    // if you need to re-record the test:
    // - change the mode in the next line to `record`
    // - update the FASTLY_AUTH, WSK_AUTH and FASTLY_NAMESPACE
    // DON'T forget to change it back afterwards, so that no credentials leak
    // you might also want to delete the previous test recordings in /test/fixtures
    // - empty the fixtures/api.fastly.com-442 folder
    // - run `npm test`
    // - revert the changes above
    // - search in the folder fixtures/api.fastly.com-442 for
    // string `POST /service/4fO8LaVL7Xtza4ksTcItHW/version/2/vcl`
    // - remove the `body` line of the request that uploads the `dynamic.vcl` file
    // (body contains dynamic.vcl)
    // TODO - simplify
    Replay.mode = 'replay';
  });

  afterEach(async () => {
    Replay.mode = 'bloody';
  });

  it('Publish Strains on an existing Service Config', async () => {
    const cmd = new PublishCommand()
      .withStrainFile(dstStrains)
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
