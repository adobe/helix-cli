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

/* global describe, it, beforeEach */

'use strict';

const sinon = require('sinon');
const CLI = require('../src/cli.js');
const UpCommand = require('../src/up.cmd');

describe('hlx up', () => {
  // mocked command instance
  let mockUp;

  beforeEach(() => {
    mockUp = sinon.createStubInstance(UpCommand);
    mockUp.withCacheEnabled.returnsThis();
    mockUp.withMinifyEnabled.returnsThis();
    mockUp.withTargetDir.returnsThis();
    mockUp.withFiles.returnsThis();
    mockUp.withOpen.returnsThis();
    mockUp.run.returnsThis();
  });

  it('hlx up runs w/o arguments', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up']);
    sinon.assert.calledWith(mockUp.withCacheEnabled, true);
    sinon.assert.calledWith(mockUp.withMinifyEnabled, false);
    sinon.assert.calledWith(mockUp.withTargetDir, '.hlx/build');
    sinon.assert.calledWith(mockUp.withFiles, ['src/**/*.htl']);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can disable cache', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--no-cache']);
    sinon.assert.calledWith(mockUp.withCacheEnabled, false);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can disable cache with value', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--cache', 'false']);
    sinon.assert.calledWith(mockUp.withCacheEnabled, false);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can enable minify', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--minify']);
    sinon.assert.calledWith(mockUp.withMinifyEnabled, true);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can set target', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--target', 'tmp/build']);
    sinon.assert.calledWith(mockUp.withTargetDir, 'tmp/build');
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can set target with -o option', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '-o', 'tmp/build']);
    sinon.assert.calledWith(mockUp.withTargetDir, 'tmp/build');
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can open browser with --open option', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--no-open', 'tmp/build']);
    sinon.assert.calledWith(mockUp.withOpen, null);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can set specify files', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--files', 'lib/*.htl', 'index.htl']);
    sinon.assert.calledWith(mockUp.withFiles, ['lib/*.htl', 'index.htl']);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can set specify files with no --files option', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', 'lib/*.htl', 'index.htl']);
    sinon.assert.calledWith(mockUp.withFiles, ['lib/*.htl', 'index.htl']);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can set specify files with no --files option and additionals', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', 'lib/*.htl', 'index.htl', '--no-cache']);
    sinon.assert.calledWith(mockUp.withFiles, ['lib/*.htl', 'index.htl']);
    sinon.assert.calledWith(mockUp.withCacheEnabled, false);
    sinon.assert.calledOnce(mockUp.run);
  });
});
