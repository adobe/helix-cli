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
const PackageCommand = require('../src/package.cmd');

describe('hlx package', () => {
  // mocked command instance
  let mockPackage;

  beforeEach(() => {
    clearHelixEnv();
    mockPackage = sinon.createStubInstance(PackageCommand);
    mockPackage.withTarget.returnsThis();
    mockPackage.withFiles.returnsThis();
    mockPackage.withOnlyModified.returnsThis();
    mockPackage.withMinify.returnsThis();
    mockPackage.run.returnsThis();
  });

  afterEach(() => {
    clearHelixEnv();
  });

  it('hlx package works with minimal arguments', () => {
    new CLI()
      .withCommandExecutor('package', mockPackage)
      .run(['package']);

    sinon.assert.calledWith(mockPackage.withOnlyModified, true);
    sinon.assert.calledWith(mockPackage.withTarget, '.hlx/build');
    sinon.assert.calledWith(mockPackage.withFiles, ['src/**/*.htl', 'src/**/*.js', 'src/**/*.jsx', 'cgi-bin/**/*.js']);
    sinon.assert.calledWith(mockPackage.withMinify, false);
    sinon.assert.calledOnce(mockPackage.run);
  });

  it('hlx package can use env', () => {
    dotenv.config({ path: path.resolve(__dirname, 'fixtures', 'all.env') });
    new CLI()
      .withCommandExecutor('package', mockPackage)
      .run(['package']);
    sinon.assert.calledWith(mockPackage.withTarget, 'foo');
    sinon.assert.calledWith(mockPackage.withFiles, ['*.htl', '*.js']);
    sinon.assert.calledWith(mockPackage.withOnlyModified, false);
    sinon.assert.calledWith(mockPackage.withMinify, true);
    sinon.assert.calledOnce(mockPackage.run);
  });

  it('hlx package can enable force flag', () => {
    new CLI()
      .withCommandExecutor('package', mockPackage)
      .run(['package',
        '--force',
      ]);

    sinon.assert.calledWith(mockPackage.withOnlyModified, false);
    sinon.assert.calledWith(mockPackage.withTarget, '.hlx/build');
    sinon.assert.calledWith(mockPackage.withMinify, false);
    sinon.assert.calledOnce(mockPackage.run);
  });

  it('hlx package can enable minify', () => {
    new CLI()
      .withCommandExecutor('package', mockPackage)
      .run(['package',
        '--minify',
      ]);

    sinon.assert.calledWith(mockPackage.withOnlyModified, true);
    sinon.assert.calledWith(mockPackage.withTarget, '.hlx/build');
    sinon.assert.calledWith(mockPackage.withMinify, true);
    sinon.assert.calledOnce(mockPackage.run);
  });

  it('hlx package can set specify files', () => {
    new CLI()
      .withCommandExecutor('package', mockPackage)
      .run(['package', '--files', 'lib/*.htl', 'index.htl']);
    sinon.assert.calledWith(mockPackage.withFiles, ['lib/*.htl', 'index.htl']);
    sinon.assert.calledOnce(mockPackage.run);
  });

  it('hlx package can set specify files without option', () => {
    new CLI()
      .withCommandExecutor('package', mockPackage)
      .run(['package', 'lib/*.htl', 'index.htl']);
    sinon.assert.calledWith(mockPackage.withFiles, ['lib/*.htl', 'index.htl']);
    sinon.assert.calledOnce(mockPackage.run);
  });

  it('hlx package can set specify files without option and additional args', () => {
    new CLI()
      .withCommandExecutor('package', mockPackage)
      .run(['package', 'lib/*.htl', 'index.htl', '--target', 'foo']);
    sinon.assert.calledWith(mockPackage.withFiles, ['lib/*.htl', 'index.htl']);
    sinon.assert.calledWith(mockPackage.withTarget, 'foo');
    sinon.assert.calledOnce(mockPackage.run);
  });
});
