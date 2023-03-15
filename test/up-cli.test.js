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
import sinon from 'sinon';
import dotenv from 'dotenv';
import path from 'path';
import { clearHelixEnv } from './utils.js';
import CLI from '../src/cli.js';
import UpCommand from '../src/up.cmd.js';

describe('hlx up', () => {
  // mocked command instance
  let mockUp;
  let deleted;
  let cli;

  before(() => {
    sinon.stub(process, 'exit');
  });

  after(() => {
    process.exit.restore();
  });

  beforeEach(async () => {
    deleted = clearHelixEnv();
    mockUp = sinon.createStubInstance(UpCommand);
    mockUp.withOpen.returnsThis();
    mockUp.withTLS.returnsThis();
    mockUp.withLiveReload.returnsThis();
    mockUp.withHttpPort.returnsThis();
    mockUp.withBindAddr.returnsThis();
    mockUp.withUrl.returnsThis();
    mockUp.withPrintIndex.returnsThis();
    mockUp.withKill.returnsThis();
    mockUp.withCache.returnsThis();
    mockUp.run.returnsThis();
    cli = (await new CLI().initCommands()).withCommandExecutor('up', mockUp);
  });

  afterEach(() => {
    sinon.assert.notCalled(process.exit);
    clearHelixEnv();
    // restore env
    Object.keys(deleted).forEach((key) => {
      process.env[key] = deleted[key];
    });
  });

  it('hlx up runs w/o arguments', async () => {
    await cli.run(['up']);
    sinon.assert.calledWith(mockUp.withOpen, '/');
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can use env', async () => {
    dotenv.config({ path: path.resolve(__rootdir, 'test', 'fixtures', 'all.env') });
    await cli.run(['up']);
    sinon.assert.calledWith(mockUp.withOpen, 'false');
    sinon.assert.calledWith(mockUp.withLiveReload, false);
    sinon.assert.calledWith(mockUp.withHttpPort, 1234);
    sinon.assert.calledWith(mockUp.withBindAddr, '*');
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up fails with non env extra argument', async () => {
    let failed = false;
    await cli
      .onFail(() => {
        failed = true;
      })
      .run(['up', '--wsk-auth']);
    sinon.assert.calledOnce(mockUp.run);
    sinon.assert.match(true, failed);
  });

  it('hlx up can disable open browser with --no-open option', async () => {
    await cli.run(['up', '--no-open']);
    sinon.assert.calledWith(mockUp.withOpen, false);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can disable live-reload browser with --no-livereload option', async () => {
    await cli.run(['up', '--no-livereload']);
    sinon.assert.calledWith(mockUp.withLiveReload, false);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can specify port number to run development server on', async () => {
    await cli.run(['up', '--port', '3210']);
    sinon.assert.calledWith(mockUp.withHttpPort, 3210);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can specify bind address to run development server on', async () => {
    await cli.run(['up', '--addr', '192.168.1.7']);
    sinon.assert.calledWith(mockUp.withBindAddr, '192.168.1.7');
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can set pages url', async () => {
    await cli.run(['up', '--pages-url', 'https://foo--bar.hlx.page']);
    sinon.assert.calledWith(mockUp.withUrl, 'https://foo--bar.hlx.page');
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can enable print index', async () => {
    await cli.run(['up', '--print-index']);
    sinon.assert.calledWith(mockUp.withPrintIndex, true);
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can enable cache', async () => {
    await cli.run(['up', '--alpha-cache', '.cache/']);
    sinon.assert.calledWith(mockUp.withCache, '.cache/');
    sinon.assert.calledOnce(mockUp.run);
  });

  it('hlx up can disable kill', async () => {
    await cli.run(['up', '--stop-other', 'false']);
    sinon.assert.calledWith(mockUp.withKill, false);
    sinon.assert.calledOnce(mockUp.run);
  });
});
