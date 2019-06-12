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

const sinon = require('sinon');
const dotenv = require('dotenv');
const path = require('path');
const { clearHelixEnv } = require('./utils.js');
const CLI = require('../src/cli.js');
const BuildCommand = require('../src/build.cmd');

describe('hlx build', () => {
  // mocked command instance
  let mockBuild;

  beforeEach(() => {
    clearHelixEnv();
    mockBuild = sinon.createStubInstance(BuildCommand);
    mockBuild.withTargetDir.returnsThis();
    mockBuild.withFiles.returnsThis();
    mockBuild.run.returnsThis();
  });

  afterEach(() => {
    clearHelixEnv();
  });

  it('hlx build runs w/o arguments', () => {
    new CLI()
      .withCommandExecutor('build', mockBuild)
      .run(['build']);
    sinon.assert.calledWith(mockBuild.withTargetDir, '.hlx/build');
    sinon.assert.calledWith(mockBuild.withFiles, ['src/**/*.htl', 'src/**/*.js', 'src/**/*.jsx', 'cgi-bin/**/*.js']);
    sinon.assert.calledOnce(mockBuild.run);
  });

  it('hlx build can use env', () => {
    dotenv.config({ path: path.resolve(__dirname, 'fixtures', 'all.env') });
    new CLI()
      .withCommandExecutor('build', mockBuild)
      .run(['build']);
    sinon.assert.calledWith(mockBuild.withTargetDir, 'foo');
    sinon.assert.calledWith(mockBuild.withFiles, ['*.htl', '*.js']);
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
      .run(['build', 'lib/*.htl', 'index.htl', '--target', 'foo']);
    sinon.assert.calledWith(mockBuild.withFiles, ['lib/*.htl', 'index.htl']);
    sinon.assert.calledWith(mockBuild.withTargetDir, 'foo');
    sinon.assert.calledOnce(mockBuild.run);
  });
});
