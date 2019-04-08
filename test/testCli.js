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

'use strict';

const assert = require('assert');
const shell = require('shelljs');
const path = require('path');
const fse = require('fs-extra');
const pkgJson = require('../package.json');
const { createTestRoot } = require('./utils.js');
const { checkNodeVersion } = require('../src/config/config-utils.js');

const cwd = process.cwd();

function runCLI(...args) {
  const cmd = ['node', path.resolve(__dirname, '../index.js'), ...args].join(' ');
  return shell.exec(cmd);
}

describe('hlx command line', () => {
  afterEach(() => {
    shell.cd(cwd);
  });

  it('hlx w/o arguments shows help and exits with != 0', () => {
    const cmd = runCLI();
    assert.notEqual(cmd.code, 0);
    assert.ok(/.*You need at least one command.*/.test(cmd.stderr));
  });

  it('hlx --version shows version', () => {
    const cmd = runCLI('--version');
    assert.equal(cmd.code, 0);
    assert.equal(cmd.stdout.trim(), pkgJson.version);
  });

  it('hlx with unknown command shows help and exists with != 0', () => {
    const cmd = runCLI('foo');
    assert.notEqual(cmd.code, 0);
    assert.ok(/.*Unknown command: foo*/.test(cmd.stderr.toString()));
  });

  it('hlx build with unknown argument shows help and exists with != 0', () => {
    const cmd = runCLI('build', '--foo=bar');
    assert.notEqual(cmd.code, 0);
    assert.ok(/.*Unknown argument: foo*/.test(cmd.stderr.toString()));
  });

  it('not-ignored .env should give warning', async () => {
    const testRoot = await createTestRoot();
    shell.cd(testRoot);
    await fse.writeFile(path.resolve(testRoot, '.env'), '# Helix Env\n', 'utf-8');
    shell.exec('git init');
    shell.exec('git add -A');
    shell.exec('git commit -m"initial"');
    const cmd = runCLI('--version');
    assert.equal(cmd.code, 0);
    assert.ok(cmd.stdout.trim().indexOf('This is typically not good because it might contain secrets') >= 0);
  });

  it('un-supported node version should give warning', async () => {
    const testVersions = [
      '1.0.0', 0,
      '8.8.0', 0,
      '8.15.0', 1,
      '9.0.0', 0,
      '10.0.0', 1,
      '11.1.0', 0,
    ];
    for (let i = 0; i < testVersions.length; i += 2) {
      let out = '';
      const nodeVersion = testVersions[i];
      const supported = testVersions[i + 1];
      checkNodeVersion(nodeVersion, {
        write: (msg) => {
          out += msg;
        },
      });
      if (supported) {
        assert.equal(out, '');
      } else {
        assert.ok(out.indexOf('does not satisfy \nthe supported version range') >= 0);
      }
    }
  });
});
