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
const BuildCommand = require('../src/build.cmd');

describe('hlx build', () => {
  // mocked command instance
  let mockBuild;

  beforeEach(() => {
    mockBuild = sinon.createStubInstance(BuildCommand);
    mockBuild.withCacheEnabled.returnsThis();
    mockBuild.withMinifyEnabled.returnsThis();
    mockBuild.withTargetDir.returnsThis();
    mockBuild.withFiles.returnsThis();
    mockBuild.run.returnsThis();
  });

  it('hlx build runs w/o arguments', () => {
    new CLI()
      .withCommandExecutor('build', mockBuild)
      .run(['build']);
    sinon.assert.calledWith(mockBuild.withCacheEnabled, false);
    sinon.assert.calledWith(mockBuild.withMinifyEnabled, false);
    sinon.assert.calledWith(mockBuild.withTargetDir, '.hlx/build');
    sinon.assert.calledWith(mockBuild.withFiles, ['src/**/*.htl', 'src/**/*.js']);
    sinon.assert.calledOnce(mockBuild.run);
  });

  it('hlx build can enable cache', () => {
    new CLI()
      .withCommandExecutor('build', mockBuild)
      .run(['build', '--cache']);
    sinon.assert.calledWith(mockBuild.withCacheEnabled, true);
    sinon.assert.calledOnce(mockBuild.run);
  });

  it('hlx build can enable cache with value', () => {
    new CLI()
      .withCommandExecutor('build', mockBuild)
      .run(['build', '--cache', 'true']);
    sinon.assert.calledWith(mockBuild.withCacheEnabled, true);
    sinon.assert.calledOnce(mockBuild.run);
  });

  it('hlx build can enable minify', () => {
    new CLI()
      .withCommandExecutor('build', mockBuild)
      .run(['build', '--minify']);
    sinon.assert.calledWith(mockBuild.withMinifyEnabled, true);
    sinon.assert.calledOnce(mockBuild.run);
  });

  it('hlx build can set target', () => {
    new CLI()
      .withCommandExecutor('build', mockBuild)
      .run(['build', '--target', 'tmp/build']);
    sinon.assert.calledWith(mockBuild.withTargetDir, 'tmp/build');
    sinon.assert.calledOnce(mockBuild.run);
  });

  it('hlx build can set target with -o option', () => {
    new CLI()
      .withCommandExecutor('build', mockBuild)
      .run(['build', '-o', 'tmp/build']);
    sinon.assert.calledWith(mockBuild.withTargetDir, 'tmp/build');
    sinon.assert.calledOnce(mockBuild.run);
  });

  it('hlx build can set specify files', () => {
    new CLI()
      .withCommandExecutor('build', mockBuild)
      .run(['build', '--files', 'lib/*.htl', 'index.htl']);
    sinon.assert.calledWith(mockBuild.withFiles, ['lib/*.htl', 'index.htl']);
    sinon.assert.calledOnce(mockBuild.run);
  });

  it('hlx build can set specify files without option', () => {
    new CLI()
      .withCommandExecutor('build', mockBuild)
      .run(['build', 'lib/*.htl', 'index.htl']);
    sinon.assert.calledWith(mockBuild.withFiles, ['lib/*.htl', 'index.htl']);
    sinon.assert.calledOnce(mockBuild.run);
  });

  it('hlx build can set specify files without option and additional args', () => {
    new CLI()
      .withCommandExecutor('build', mockBuild)
      .run(['build', 'lib/*.htl', 'index.htl', '--no-cache']);
    sinon.assert.calledWith(mockBuild.withFiles, ['lib/*.htl', 'index.htl']);
    sinon.assert.calledWith(mockBuild.withCacheEnabled, false);
    sinon.assert.calledOnce(mockBuild.run);
  });
});
