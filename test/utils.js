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
const http = require('http');
const { JSDOM } = require('jsdom');
const { assertEquivalentNode } = require('@adobe/helix-shared-dom');

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

function assertFile(p, expectMissing) {
  const exists = fse.pathExistsSync(p);
  if (!exists && !expectMissing) {
    assert.fail(`Expected file at ${p} exists`);
  }
  if (exists && expectMissing) {
    assert.fail(`Unexpected file at ${p} exists`);
  }
}

async function assertFileEqual(actualFile, expectedFile) {
  const actual = await fse.readFile(actualFile, 'utf-8');
  const expected = await fse.readFile(expectedFile, 'utf-8');
  assert.equal(actual.trim(), expected.trim());
}

async function assertHttp(url, status, spec, replacements = []) {
  return new Promise((resolve, reject) => {
    let data = '';
    http.get(url, (res) => {
      try {
        assert.equal(res.statusCode, status);
      } catch (e) {
        res.resume();
        reject(e);
      }

      res
        .on('data', (chunk) => {
          data += chunk;
        })
        .on('end', () => {
          try {
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
                let expected = fse.readFileSync(path.resolve(__dirname, 'specs', spec)).toString();
                replacements.forEach((r) => {
                  expected = expected.replace(r.pattern, r.with);
                });
                if (spec.endsWith('.json')) {
                  assert.deepEqual(JSON.parse(data), JSON.parse(expected));
                } else {
                  assert.equal(data.trim(), expected.trim());
                }
              }
            }
            resolve(data);
          } catch (e) {
            reject(e);
          }
        });
    }).on('error', (e) => {
      reject(e);
    });
  });
}

async function assertHttpDom(url, status, spec) {
  return new Promise((resolve, reject) => {
    let data = '';
    http.get(url, (res) => {
      try {
        assert.equal(res.statusCode, status);
      } catch (e) {
        res.resume();
        reject(e);
      }

      res
        .on('data', (chunk) => {
          data += chunk;
        })
        .on('end', () => {
          try {
            if (spec) {
              const datadom = new JSDOM(data);
              const specdom = new JSDOM(fse.readFileSync(path.resolve(__dirname, 'specs', spec)).toString());
              try {
                assertEquivalentNode(datadom.window.document, specdom.window.document);
              } catch (e) {
                e.actual = datadom.serialize();
                e.expected = specdom.serialize();
                throw e;
              }
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        });
    }).on('error', (e) => {
      reject(e);
    });
  });
}

async function createTestRoot() {
  const dir = path.resolve(__dirname, 'tmp', crypto.randomBytes(16).toString('hex'));
  await fse.ensureDir(dir);
  return dir;
}

async function createFakeTestRoot() {
  return path.resolve(__dirname, 'tmp', crypto.randomBytes(16).toString('hex'));
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
  assertFile,
  assertFileEqual,
  assertHttp,
  assertHttpDom,
  initGit,
  createTestRoot,
  clearHelixEnv,
  createFakeTestRoot,
  setupProject,
  wait,
};
