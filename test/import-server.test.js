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
/* eslint-disable no-underscore-dangle */
import os from 'os';
import assert from 'assert';
import fse from 'fs-extra';
import path from 'path';
import { HelixImportProject } from '../src/server/HelixImportProject.js';
import {
  assertHttp, createTestRoot, rawGet, setupProject,
} from './utils.js';

const TEST_DIR = path.resolve(__rootdir, 'test', 'fixtures', 'import');

describe('Helix Server', () => {
  let testRoot;

  beforeEach(async () => {
    testRoot = await createTestRoot();
  });

  afterEach(async () => {
    if (os.platform() === 'win32') {
      // Note: the async variant of remove hangs on windows, probably due to open filehandle to
      // logs/request.log
      fse.removeSync(testRoot);
    } else {
      await fse.remove(testRoot);
    }
  });

  it('does not start on occupied port', async () => {
    const cwd = await setupProject(TEST_DIR, testRoot);
    const project = new HelixImportProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLogger(console);
    await project.init();
    try {
      await project.start();
      const project2 = new HelixImportProject()
        .withCwd(cwd)
        .withKill(false)
        .withHttpPort(project.server.port);
      await project2.init();
      await assert.rejects(project2.start(), Error(`Port ${project.server.port} already in use by another process.`));
    } finally {
      await project.stop();
    }
  });

  it('does not start on occupied port on ADDR_ANY', async () => {
    const cwd = await setupProject(TEST_DIR, testRoot);
    const project = new HelixImportProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withBindAddr('*')
      .withLogger(console);
    await project.init();
    try {
      await project.start();
      const project2 = new HelixImportProject()
        .withCwd(cwd)
        .withKill(false)
        .withHttpPort(project.server.port);
      await project2.init();
      await assert.rejects(project2.start(), Error(`Port ${project.server.port} already in use by another process.`));
    } finally {
      await project.stop();
    }
  });

  it('kills other server', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixImportProject()
      .withCwd(cwd)
      .withLogger(console)
      .withHttpPort(0);
    await project.init();
    try {
      await project.start();

      const project2 = new HelixImportProject()
        .withCwd(cwd)
        .withKill(true)
        .withHttpPort(project.server.port);
      await project2.init();
      try {
        await project2.start();
        assert.ok(project2.started, 'server has killed other server.');
      } catch (e) {
        assert.fail(`server should have killed the other server. ${e.message}`);
      } finally {
        await project2.stop();
      }
    } finally {
      await project.stop();
    }
  }).timeout(5000);

  it('deliver static content resource', async () => {
    const cwd = await setupProject(TEST_DIR, testRoot);
    const project = new HelixImportProject()
      .withCwd(cwd)
      .withHttpPort(0);
    await project.init();
    try {
      await project.start();
      await assertHttp(`http://127.0.0.1:${project.server.port}/tools/importer/import.js`, 200);
    } finally {
      await project.stop();
    }
  });

  it('rejects path outside project directory', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixImportProject()
      .withCwd(cwd)
      .withHttpPort(0);

    await project.init();
    try {
      await project.start();
      const response = await rawGet('127.0.0.1', project.server.port, '/tools/../../../win.ini');
      assert.strictEqual(response.toString().startsWith('HTTP/1.1 403 Forbidden'), true);
    } finally {
      await project.stop();
    }
  });

  it('stops server on /.kill', async () => {
    const cwd = await setupProject(TEST_DIR, testRoot);
    const project = new HelixImportProject()
      .withCwd(cwd)
      .withHttpPort(0);
    await project.init();
    try {
      await project.start();
      await assertHttp(`http://127.0.0.1:${project.server.port}/.kill`, 200, 'expected_goodbye.txt');
    } finally {
      assert.ok(!project.server.isStarted());
      await project.stop();
    }
  });
});
