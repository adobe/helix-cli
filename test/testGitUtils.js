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
const fse = require('fs-extra');
const crypto = require('crypto');
const shell = require('shelljs');
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

  it('getOrigin #unit', () => {
    shell.exec('git remote add origin http://github.com/adobe/dummy.git');
    assert.ok(GitUtils.getOrigin());
    assert.ok(/dummy/.test(GitUtils.getOrigin()));

    shell.cd(pwd);
    assert.ok(/dummy/.test(GitUtils.getOrigin(testRoot)));
  });

  it('getOriginURL #unit', () => {
    shell.exec('git remote add origin http://github.com/adobe/dummy.git');
    assert.ok(GitUtils.getOriginURL());
    assert.equal(GitUtils.getOriginURL().toString(), 'http://github.com/adobe/dummy.git');

    shell.cd(pwd);
    assert.equal(GitUtils.getOriginURL(testRoot).toString(), 'http://github.com/adobe/dummy.git');
  });

  it('getBranch #unit', () => {
    shell.exec('git checkout -b newbranch');
    assert.equal(GitUtils.getBranch(), 'newbranch');

    shell.cd(pwd);
    assert.equal(GitUtils.getBranch(testRoot), 'newbranch');
  });

  it('isDirty #unit', async () => {
    assert.equal(GitUtils.isDirty(), false);
    await fse.writeFile(path.resolve(testRoot, 'README.md'), 'Hello, world.\n', 'utf-8');
    assert.equal(GitUtils.isDirty(), true);

    shell.cd(pwd);
    assert.equal(GitUtils.isDirty(testRoot), true);
  });

  it('getBranchFlag #unit', async () => {
    assert.equal(GitUtils.getBranchFlag(), 'master');
    await fse.writeFile(path.resolve(testRoot, 'README.md'), 'Hello, world.\n', 'utf-8');
    assert.equal(GitUtils.getBranchFlag(), 'dirty');

    shell.cd(pwd);
    assert.equal(GitUtils.getBranchFlag(testRoot), 'dirty');
  });

  it('getRepository #unit', async () => {
    shell.exec('git remote add origin http://github.com/adobe/dummy.git');
    assert.equal(GitUtils.getRepository(), 'http---github-com-adobe-dummy-git');

    shell.cd(pwd);
    assert.equal(GitUtils.getRepository(testRoot), 'http---github-com-adobe-dummy-git');
  });

  it('getRepository (local) #unit', async () => {
    assert.equal(GitUtils.getRepository(), `local--${path.basename(testRoot)}`);

    shell.cd(pwd);
    assert.equal(GitUtils.getRepository(testRoot), `local--${path.basename(testRoot)}`);
  });

  it('getCurrentRevision #unit', async () => {
    assert.ok(/[0-9a-fA-F]+/.test(GitUtils.getCurrentRevision()));

    shell.cd(pwd);
    assert.ok(/[0-9a-fA-F]+/.test(GitUtils.getCurrentRevision(testRoot)));
  });
});
