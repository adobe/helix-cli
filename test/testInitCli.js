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

/* eslint-disable global-require */

'use strict';

const assert = require('assert');

class MockInit {
  withDirectory(dir) {
    this.dir = dir;
    return this;
  }

  withName(name) {
    this.name = name;
    return this;
  }

  run() {
    this.runCalled = true;
    return this;
  }
}


/* global describe, it, beforeEach */

describe('hlx init', () => {
  beforeEach(() => {
    delete require.cache[require.resolve('../src/cli.js')];
  });

  it('hlx init accepts name and directory', () => {
    const CLI = require('../src/cli.js');

    const mockInit = new MockInit();
    CLI.setCommandExecutor('init', mockInit);
    CLI.run(['init', 'name', 'dir']);

    assert.equal(mockInit.name, 'name');
    assert.equal(mockInit.dir, 'dir');
    assert.equal(mockInit.runCalled, true);
  });

  it('hlx init directory is optional', () => {
    const CLI = require('../src/cli.js');

    const mockInit = new MockInit();
    CLI.setCommandExecutor('init', mockInit);
    CLI.run(['init', 'name']);

    assert.equal(mockInit.name, 'name');
    assert.equal(mockInit.dir, '.');
    assert.equal(mockInit.runCalled, true);
  });

  it('hlx init fails with no name', (done) => {
    const CLI = require('../src/cli.js');

    const mockInit = new MockInit();
    CLI.setCommandExecutor('init', mockInit);
    CLI.onFail((err) => {
      assert.equal(err, 'Not enough non-option arguments: got 0, need at least 1');
      done();
    });
    CLI.run(['init']);
    assert.fail('init w/o arguments should fail.');
  });
});
