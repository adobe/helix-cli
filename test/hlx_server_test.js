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

/* global describe, before, after, it */
/* eslint-disable no-underscore-dangle */

const assert = require('assert');
const fse = require('fs-extra');
const http = require('http');
const path = require('path');
const shell = require('shelljs'); // eslint-disable-line import/no-extraneous-dependencies
const HelixProject = require('../src/HelixProject.js');

if (!shell.which('git')) {
  shell.echo('Sorry, this tests requires git');
  shell.exit(1);
}

// throw a Javascript error when any shell.js command encounters an error
shell.config.fatal = true;

const SPEC_ROOT = path.resolve(__dirname, 'specs');

const SPECS_WITH_GIT = [
  path.join(SPEC_ROOT, 'local'),
];

function initRepository(dir) {
  const pwd = shell.pwd();
  shell.cd(dir);
  shell.exec('git init');
  shell.exec('git add -A');
  shell.exec('git commit -m"initial commit."');
  shell.cd(pwd);
}

function removeRepository(dir) {
  shell.rm('-rf', path.resolve(dir, '.git'));
}

// todo: use replay ?
async function assertHttp(url, status, spec) {
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
              const expected = fse.readFileSync(path.resolve(__dirname, 'specs', spec)).toString();
              assert.equal(data, expected);
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

describe('Helix Server', () => {
  before(() => {
    // create git repos
    SPECS_WITH_GIT.forEach(initRepository);
  });

  after(() => {
    // create fake git repos
    SPECS_WITH_GIT.forEach(removeRepository);
  });

  it('deliver rendered resource', async () => {
    const cwd = path.join(SPEC_ROOT, 'local');
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0);
    await project.init();
    try {
      await project.start();
      await assertHttp(`http://localhost:${project.server.port}/index.html`, 200, 'expected_index.html');
    } finally {
      await project.stop();
    }
  });

  it('deliver static content resource', async () => {
    const cwd = path.join(SPEC_ROOT, 'local');
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0);
    await project.init();
    try {
      await project.start();
      await assertHttp(`http://localhost:${project.server.port}/welcome.txt`, 200, 'expected_welcome.txt');
    } finally {
      await project.stop();
    }
  });

  it('deliver static dist resource', async () => {
    const cwd = path.join(SPEC_ROOT, 'local');
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0);
    await project.init();
    try {
      await project.start();
      await assertHttp(`http://localhost:${project.server.port}/dist/styles.css`, 200, 'expected_styles.css');
    } finally {
      await project.stop();
    }
  });

  it('deliver 404 for static dist non existing', async () => {
    const cwd = path.join(SPEC_ROOT, 'local');
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0);
    await project.init();
    try {
      await project.start();
      await assertHttp(`http://localhost:${project.server.port}/dist/notfound.css`, 404);
    } finally {
      await project.stop();
    }
  });

  it('deliver 404 for static content non existing', async () => {
    const cwd = path.join(SPEC_ROOT, 'local');
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0);
    await project.init();
    try {
      await project.start();
      await assertHttp(`http://localhost:${project.server.port}/notfound.css`, 404);
    } finally {
      await project.stop();
    }
  });
});
