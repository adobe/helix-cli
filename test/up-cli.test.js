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
const sinon = require('sinon');
const dotenv = require('dotenv');
const path = require('path');
const { clearHelixEnv } = require('./utils.js');
const CLI = require('../src/cli.js');
const UpCommand = require('../src/up.cmd');

describe('hlx up', () => {
  // mocked command instance
  let mockUp;
  let deleted;

  beforeEach(() => {
    deleted = clearHelixEnv();
    mockUp = sinon.createStubInstance(UpCommand);
    mockUp.withOpen.returnsThis();
    mockUp.withLiveReload.returnsThis();
    mockUp.withHttpPort.returnsThis();
    mockUp.withPagesUrl.returnsThis();
    mockUp.run.returnsThis();
  });

  afterEach(() => {
    clearHelixEnv();
    // restore env
    Object.keys(deleted).forEach((key) => {
      process.env[key] = deleted[key];
    });
  });

  it('hlx up runs w/o arguments', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up']);
    sinon.assert.calledWith(mockUp.withOpen, '/');
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can use env', () => {
    dotenv.config({ path: path.resolve(__dirname, 'fixtures', 'all.env') });
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up']);
    sinon.assert.calledWith(mockUp.withOpen, 'false');
    sinon.assert.calledWith(mockUp.withLiveReload, false);
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

  it('hlx up can disable open browser with --no-open option', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--no-open']);
    sinon.assert.calledWith(mockUp.withOpen, false);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can disable live-reload browser with --no-livereload option', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--no-livereload']);
    sinon.assert.calledWith(mockUp.withLiveReload, false);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can specify port number to run development server on', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--port', '3210']);
    sinon.assert.calledWith(mockUp.withHttpPort, 3210);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can set pages url', () => {
    new CLI()
      .withCommandExecutor('up', mockUp)
      .run(['up', '--pages-url', 'https://foo--bar.hlx.page']);
    sinon.assert.calledWith(mockUp.withPagesUrl, 'https://foo--bar.hlx.page');
    sinon.assert.calledOnce(mockUp.run);
  });
});
