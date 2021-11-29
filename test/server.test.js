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
import nock from 'nock';
import HelixProject from '../src/server/HelixProject.js';
import { assertHttp, createTestRoot, setupProject } from './utils.js';
import { fetch } from '../src/fetch-utils.js';

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
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withLogger(console)
      .withHttpPort(0);
    await project.init();
    try {
      await project.start();

      const project2 = new HelixProject()
        .withCwd(cwd)
        .withHttpPort(project.server.port);
      await project2.init();
      try {
        await project.start();
        assert.fail('server should detect port in use.');
      } catch (e) {
        assert.equal(e.message, `Port ${project.server.port} already in use by another process.`);
      }
    } finally {
      await project.stop();
    }
  });

  it('deliver static content resource', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0);
    await project.init();
    try {
      await project.start();
      await assertHttp(`http://localhost:${project.server.port}/welcome.txt`, 200, 'expected_welcome.txt');
    } finally {
      await project.stop();
    }
  });

  it('deliver 404 for static content non existing', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withProxyUrl('http://main--foo--bar.hlx3.page');

    await project.init();

    const scope = nock('http://main--foo--bar.hlx3.page')
      .get('/notfound.css')
      .reply(404)
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    try {
      await project.start();
      await assertHttp(`http://localhost:${project.server.port}/notfound.css`, 404);
    } finally {
      await project.stop();
      scope.done();
    }
  });

  it('delivers local file system first.', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withProxyUrl('http://main--foo--bar.hlx3.page');

    await project.init();

    const scope = nock('http://main--foo--bar.hlx3.page')
      .get('/local.html')
      .optionally(true)
      .reply(200, 'foo')
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    try {
      await project.start();
      const resp = await fetch(`http://localhost:${project.server.port}/local.html`, {
        cache: 'no-store',
      });
      const ret = await resp.text();
      assert.strictEqual(resp.status, 200);
      assert.strictEqual(ret.trim(), 'hello index');
      assert.strictEqual(resp.headers.get('access-control-allow-origin'), '*');
    } finally {
      await project.stop();
      scope.done();
    }
  });

  it('delivers from proxy.', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withProxyUrl('http://main--foo--bar.hlx.page');

    await project.init();
    project.log.level = 'silly';

    const scope = nock('http://main--foo--bar.hlx.page')
      .get('/readme.html')
      .reply(200, 'hello readme')
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    try {
      await project.start();
      const resp = await fetch(`http://localhost:${project.server.port}/readme.html`, {
        cache: 'no-store',
      });
      const ret = await resp.text();
      assert.strictEqual(resp.status, 200);
      assert.strictEqual(ret.trim(), 'hello readme');
      assert.strictEqual(resp.headers.get('access-control-allow-origin'), '*');
      assert.strictEqual(resp.headers.get('via'), '1.0 main--foo--bar.hlx.page');
    } finally {
      await project.stop();
      scope.done();
    }
  });
});
