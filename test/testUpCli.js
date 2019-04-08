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
const UpCommand = require('../src/up.cmd');

describe('hlx up', () => {
  // mocked command instance
  let mockUp;

  beforeEach(() => {
    clearHelixEnv();
    mockUp = sinon.createStubInstance(UpCommand);
    mockUp.withCacheEnabled.returnsThis();
    mockUp.withMinifyEnabled.returnsThis();
    mockUp.withTargetDir.returnsThis();
    mockUp.withFiles.returnsThis();
    mockUp.withOpen.returnsThis();
    mockUp.withHttpPort.returnsThis();
    mockUp.withSaveConfig.returnsThis();
    mockUp.withOverrideHost.returnsThis();
    mockUp.run.returnsThis();
  });

  afterEach(() => {
    clearHelixEnv();
  });

  it('hlx up runs w/o arguments', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up']);
    sinon.assert.calledWith(mockUp.withCacheEnabled, false);
    sinon.assert.calledWith(mockUp.withMinifyEnabled, false);
    sinon.assert.calledWith(mockUp.withSaveConfig, false);
    sinon.assert.calledWith(mockUp.withTargetDir, '.hlx/build');
    sinon.assert.calledWith(mockUp.withFiles, ['src/**/*.htl', 'src/**/*.js']);
    sinon.assert.calledWith(mockUp.withOverrideHost, undefined);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can use env', () => {
    dotenv.config({ path: path.resolve(__dirname, 'fixtures', 'all.env') });
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up']);
    sinon.assert.calledWith(mockUp.withCacheEnabled, true);
    sinon.assert.calledWith(mockUp.withMinifyEnabled, true);
    sinon.assert.calledWith(mockUp.withTargetDir, 'foo');
    sinon.assert.calledWith(mockUp.withFiles, ['*.htl', '*.js']);
    sinon.assert.calledWith(mockUp.withOverrideHost, 'www.project-helix.io');
    sinon.assert.calledWith(mockUp.withOpen, false);
    sinon.assert.calledWith(mockUp.withHttpPort, 1234);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up fails with non env extra argument', () => {
    let failed = false;
    new CLI()
      .withCommandExecutor('up', mockUp)
      .onFail(() => {
        failed = true;
      })
      .run(['up', '--wsk-auth']);
    sinon.assert.calledOnce(mockUp.run);
    sinon.assert.match(true, failed);
  });

  it('hlx up fails with HLX_SAVE_CONFIG env', () => {
    process.env.HLX_SAVE_CONFIG = true;
    let failed = false;
    new CLI()
      .withCommandExecutor('up', mockUp)
      .onFail((e) => {
        failed = e;
      })
      .run(['up']);
    sinon.assert.calledOnce(mockUp.run);
    sinon.assert.match('HLX_SAVE_CONFIG is not allowed in environment.', failed);
  });

  it('hlx up can enable cache', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--cache']);
    sinon.assert.calledWith(mockUp.withCacheEnabled, true);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can enable cache with value', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--cache', 'true']);
    sinon.assert.calledWith(mockUp.withCacheEnabled, true);
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
    sinon.assert.calledWith(mockUp.withOpen, false);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up save config', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--save-config']);
    sinon.assert.calledWith(mockUp.withSaveConfig, true);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can set specify files', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--files', 'lib/*.htl', 'index.htl']);
    sinon.assert.calledWith(mockUp.withFiles, ['lib/*.htl', 'index.htl']);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can set override host', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--host', 'www.project-helix.io']);
    sinon.assert.calledWith(mockUp.withOverrideHost, 'www.project-helix.io');
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

  it('hlx up can specify port number to run development server on', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--port', '3210']);
    sinon.assert.calledWith(mockUp.withHttpPort, 3210);
    sinon.assert.calledOnce(mockUp.run);
  });
});
