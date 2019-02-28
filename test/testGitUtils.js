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

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const net = require('net');
const fse = require('fs-extra');
const shell = require('shelljs');

const git = require('isomorphic-git');
git.plugins.set('fs', require('fs'));

const GitUtils = require('../src/git-utils');

if (!shell.which('git')) {
  shell.echo('Sorry, this tests requires git');
  shell.exit(1);
}

async function createTestRoot() {
  const dir = path.resolve(__dirname, 'tmp', crypto.randomBytes(16).toString('hex'));
  await fse.ensureDir(dir);
  return dir;
}

describe('Testing GitUtils', () => {
  let testRoot;
  let pwd;
  beforeEach(async () => {
    testRoot = await createTestRoot();
    await fse.writeFile(path.resolve(testRoot, 'README.md'), 'Hello\n', 'utf-8');
    await fse.writeFile(path.resolve(testRoot, '.gitignore'), '.env\n', 'utf-8');
    await fse.writeFile(path.resolve(testRoot, '.env'), 'HLX_BLA=123\n', 'utf-8');

    // throw a Javascript error when any shell.js command encounters an error
    shell.config.fatal = true;

    // init git repo
    pwd = shell.pwd();
    shell.cd(testRoot);
    shell.exec('git init');
    shell.exec('git add -A');
    shell.exec('git commit -m"initial commit."');
  });

  afterEach(async () => {
    shell.cd(pwd);
    await fse.remove(testRoot);
  });

  it('getOrigin #unit', async () => {
    shell.exec('git remote add origin http://github.com/adobe/dummy.git');
    assert.ok(await GitUtils.getOrigin(testRoot));
    assert.ok(/dummy/.test(await GitUtils.getOrigin(testRoot)));
  });

  it('getOriginURL #unit', async () => {
    shell.exec('git remote add origin http://github.com/adobe/dummy.git');
    assert.ok(await GitUtils.getOriginURL(testRoot));
    assert.equal((await GitUtils.getOriginURL(testRoot)).toString(), 'http://github.com/adobe/dummy.git');
  });

  it('getBranch #unit', async () => {
    shell.exec('git checkout -b newbranch');
    assert.equal(await GitUtils.getBranch(testRoot), 'newbranch');
    shell.exec('git tag v0.0.0');
    assert.equal(await GitUtils.getBranch(testRoot), 'v0.0.0');
  });

  it('isDirty #unit', async () => {
    assert.equal(await GitUtils.isDirty(testRoot), false);
    await fse.writeFile(path.resolve(testRoot, 'README.md'), 'Hello, world.\n', 'utf-8');
    assert.equal(await GitUtils.isDirty(testRoot), true);
  });

  it('isDirty #unit with new file', async () => {
    assert.equal(await GitUtils.isDirty(testRoot), false);
    await fse.writeFile(path.resolve(testRoot, 'index.md'), 'Hello, world.\n', 'utf-8');
    assert.equal(await GitUtils.isDirty(testRoot), true);
  });

  it('isDirty #unit with staged file', async () => {
    assert.equal(await GitUtils.isDirty(testRoot), false);
    await fse.writeFile(path.resolve(testRoot, 'index.md'), 'Hello, world.\n', 'utf-8');
    shell.exec('git add -A');
    assert.equal(await GitUtils.isDirty(testRoot), true);
  });

  it('isDirty #unit with deleted file', async () => {
    assert.equal(await GitUtils.isDirty(testRoot), false);
    await fse.remove(path.resolve(testRoot, 'README.md'));
    assert.equal(await GitUtils.isDirty(testRoot), true);
  });

  it('isDirty #unit with unix socket', async () => {
    assert.equal(await GitUtils.isDirty(testRoot), false);

    await new Promise((resolve) => {
      const unixSocketServer = net.createServer();
      unixSocketServer.listen(path.resolve(testRoot, 'test.sock'), () => {
        unixSocketServer.close(resolve);
      });
    });

    assert.equal(await GitUtils.isDirty(testRoot), false);
  });

  it('getBranchFlag #unit', async () => {
    assert.equal(await GitUtils.getBranchFlag(testRoot), 'master');
    await fse.writeFile(path.resolve(testRoot, 'README.md'), 'Hello, world.\n', 'utf-8');
    assert.equal(await GitUtils.getBranchFlag(testRoot), 'dirty');
  });

  it('getRepository #unit', async () => {
    shell.exec('git remote add origin http://github.com/adobe/dummy.git');
    assert.equal(await GitUtils.getRepository(testRoot), 'http---github-com-adobe-dummy-git');
  });

  it('getRepository (local) #unit', async () => {
    assert.equal(await GitUtils.getRepository(testRoot), `local--${path.basename(testRoot)}`);
  });

  it('getCurrentRevision #unit', async () => {
    assert.ok(/[0-9a-fA-F]+/.test(await GitUtils.getCurrentRevision(testRoot)));
  });
});
