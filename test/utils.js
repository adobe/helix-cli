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
const path = require('path');
const shell = require('shelljs');
const crypto = require('crypto');
const fse = require('fs-extra');
const { fetch } = require('../src/fetch-utils.js');

/**
 * init git in integration so that helix-simulator can run
 */
function initGit(dir, remote, branch) {
  const pwd = shell.pwd();
  shell.cd(dir);
  shell.exec('git init');
  shell.exec('git checkout -b master');
  shell.exec('git add -A');
  shell.exec('git commit -m"initial commit."');
  if (remote) {
    shell.exec(`git remote add origin ${remote}`);
  }
  if (branch) {
    shell.exec(`git checkout -b ${branch}`);
  }
  shell.cd(pwd);
}

function clearHelixEnv() {
  const deleted = {};
  Object.keys(process.env).filter((key) => key.startsWith('HLX_')).forEach((key) => {
    deleted[key] = process.env[key];
    delete process.env[key];
  });
  return deleted;
}

async function assertHttp(url, status, spec, replacements = []) {
  const resp = await fetch(url, {
    cache: 'no-store',
  });
  assert.strictEqual(resp.status, status);
  const data = await resp.text();
  if (spec) {
    if (Array.isArray(spec)) {
      spec.forEach((str) => {
        try {
          assert.equal(data.indexOf(str) >= 0, true);
        } catch (e) {
          assert.fail(`response does not contain string "${str}"`);
        }
      });
    } else {
      let expected = await fse.readFile(path.resolve(__dirname, 'specs', spec), 'utf-8');
      replacements.forEach((r) => {
        expected = expected.replace(r.pattern, r.with);
      });
      if (spec.endsWith('.json')) {
        assert.deepStrictEqual(JSON.parse(data), JSON.parse(expected));
      } else {
        assert.strictEqual(data.trim(), expected.trim());
      }
    }
  }
  return data;
}

async function createTestRoot() {
  const dir = path.resolve(__dirname, 'tmp', crypto.randomBytes(16).toString('hex'));
  await fse.ensureDir(dir);
  return dir;
}

async function setupProject(srcDir, root) {
  const dir = path.resolve(root, path.basename(srcDir));
  await fse.copy(srcDir, dir);
  return dir;
}

async function wait(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

module.exports = {
  assertHttp,
  initGit,
  createTestRoot,
  clearHelixEnv,
  setupProject,
  wait,
};
