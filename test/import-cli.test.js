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
import ImportCommand from '../src/import.cmd.js';

describe('hlx import', () => {
  // mocked command instance
  let mockImport;
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
    mockImport = sinon.createStubInstance(ImportCommand);
    mockImport.withOpen.returnsThis();
    mockImport.withHttpPort.returnsThis();
    mockImport.withBindAddr.returnsThis();
    mockImport.withKill.returnsThis();
    mockImport.withCache.returnsThis();
    mockImport.withSkipUI.returnsThis();
    mockImport.withUIRepo.returnsThis();
    mockImport.run.returnsThis();
    cli = (await new CLI().initCommands()).withCommandExecutor('import', mockImport);
  });

  afterEach(() => {
    sinon.assert.notCalled(process.exit);
    clearHelixEnv();
    // restore env
    Object.keys(deleted).forEach((key) => {
      process.env[key] = deleted[key];
    });
  });

  it('hlx import runs w/o arguments', async () => {
    await cli.run(['import']);
    sinon.assert.calledWith(mockImport.withOpen, '/tools/importer/helix-importer-ui/index.html');
    sinon.assert.calledWith(mockImport.withSkipUI, false);
    sinon.assert.calledWith(mockImport.withUIRepo, 'https://github.com/adobe/helix-importer-ui');
    sinon.assert.calledOnce(mockImport.run);
  });

  it('hlx import can use env', async () => {
    dotenv.config({ path: path.resolve(__rootdir, 'test', 'fixtures', 'all.env') });
    await cli.run(['import']);
    sinon.assert.calledWith(mockImport.withOpen, 'false');
    sinon.assert.calledWith(mockImport.withHttpPort, 1234);
    sinon.assert.calledOnce(mockImport.run);
  });

  it('hlx import fails with non env extra argument', async () => {
    let failed = false;
    await cli
      .onFail(() => {
        failed = true;
      })
      .run(['import', '--wsk-auth']);
    sinon.assert.calledOnce(mockImport.run);
    sinon.assert.match(true, failed);
  });

  it('hlx import can disable open browser with --no-open option', async () => {
    await cli.run(['import', '--no-open']);
    sinon.assert.calledWith(mockImport.withOpen, false);
    sinon.assert.calledOnce(mockImport.run);
  });

  it('hlx import can disable open browser with --open option', async () => {
    await cli.run(['import', '--open', 'false']);
    sinon.assert.calledWith(mockImport.withOpen, 'false');
    sinon.assert.calledOnce(mockImport.run);
  });

  it('hlx import can open browser with custom url', async () => {
    await cli.run(['import', '--open', 'http://localhost:1234']);
    sinon.assert.calledWith(mockImport.withOpen, 'http://localhost:1234');
    sinon.assert.calledOnce(mockImport.run);
  });

  it('hlx import can specify port number to run proxy server on', async () => {
    await cli.run(['import', '--port', '3210']);
    sinon.assert.calledWith(mockImport.withHttpPort, 3210);
    sinon.assert.calledOnce(mockImport.run);
  });

  it('hlx import can specify bind address to run development server on', async () => {
    await cli.run(['import', '--addr', '192.168.1.7']);
    sinon.assert.calledWith(mockImport.withBindAddr, '192.168.1.7');
    sinon.assert.calledOnce(mockImport.run);
  });

  it('hlx import can enable cache', async () => {
    await cli.run(['import', '--cache', '.cache/']);
    sinon.assert.calledWith(mockImport.withCache, '.cache/');
    sinon.assert.calledOnce(mockImport.run);
  });

  it('hlx import can disable kill', async () => {
    await cli.run(['import', '--stop-other', 'false']);
    sinon.assert.calledWith(mockImport.withKill, false);
    sinon.assert.calledOnce(mockImport.run);
  });

  it('hlx import can skip ui install', async () => {
    await cli.run(['import', '--skip-ui']);
    sinon.assert.calledWith(mockImport.withSkipUI, true);
    sinon.assert.calledOnce(mockImport.run);
  });

  it('hlx import can change ui repo', async () => {
    await cli.run(['import', '--ui-repo', 'https://github.com/adobe/helix-importer-ui#somebranch']);
    sinon.assert.calledWith(mockImport.withUIRepo, 'https://github.com/adobe/helix-importer-ui#somebranch');
    sinon.assert.calledOnce(mockImport.run);
  });
});
