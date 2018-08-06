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

/* global describe, it */

'use strict';

const assert = require('assert');
const shell = require('shelljs');
const path = require('path');
const pkgJson = require('../package.json');

function runCLI(...args) {
  const cmd = ['node', path.resolve(__dirname, '../index.js'), ...args].join(' ');
  return shell.exec(cmd);
}

describe('hlx command line', () => {
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
    assert.ok(/.*Unknown argument: foo*/.test(cmd.stderr.toString()));
  });
});
