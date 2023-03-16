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
import { HelixProject } from '../src/server/HelixProject.js';
import {
  Nock, assertHttp, createTestRoot, setupProject, rawGet,
} from './utils.js';
import { fetch } from '../src/fetch-utils.js';

describe('Helix Server', () => {
  let nock;
  let testRoot;

  beforeEach(async () => {
    nock = new Nock();
    nock.enableNetConnect(/127.0.0.1/);
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
    nock.done();
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
        .withKill(false)
        .withHttpPort(project.server.port);
      await project2.init();
      try {
        await project2.start();
        assert.fail('server should detect port in use.');
      } catch (e) {
        assert.equal(e.message, `Port ${project.server.port} already in use by another process.`);
      }
    } finally {
      await project.stop();
    }
  });

  it('kills other server', async () => {
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
  });

  it('deliver static content resource', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withProxyUrl('https://main--foo--bar.hlx.page/')
      .withHttpPort(0);

    nock('https://main--foo--bar.hlx.page')
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    await project.init();
    try {
      await project.start();
      await assertHttp(`http://127.0.0.1:${project.server.port}/welcome.txt`, 200, 'expected_welcome.txt');
    } finally {
      await project.stop();
    }
  });

  it('rejects path outside project directory', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withProxyUrl('https://main--foo--bar.hlx.page/')
      .withHttpPort(0);

    nock('https://main--foo--bar.hlx.page')
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    await project.init();
    try {
      await project.start();
      const response = await rawGet('127.0.0.1', project.server.port, '/../../../win.ini');
      assert.strictEqual(response.toString().startsWith('HTTP/1.1 403 Forbidden'), true);
    } finally {
      await project.stop();
    }
  });

  it('stops server on /.kill', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
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

  it('deliver 404 for static content non existing', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withProxyUrl('http://main--foo--bar.hlx.page');

    await project.init();

    nock('http://main--foo--bar.hlx.page')
      .get('/notfound.css')
      .reply(404)
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    try {
      await project.start();
      await assertHttp(`http://127.0.0.1:${project.server.port}/notfound.css`, 404);
    } finally {
      await project.stop();
    }
  });

  it('delivers local file system first.', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withProxyUrl('http://main--foo--bar.hlx.page');

    await project.init();

    nock('http://main--foo--bar.hlx.page')
      .get('/local.html')
      .optionally(true)
      .reply(200, 'foo')
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    try {
      await project.start();
      const resp = await fetch(`http://127.0.0.1:${project.server.port}/local.html`, {
        cache: 'no-store',
      });
      const ret = await resp.text();
      assert.strictEqual(resp.status, 200);
      assert.strictEqual(ret.trim(), 'hello index');
      assert.strictEqual(resp.headers.get('access-control-allow-origin'), '*');
    } finally {
      await project.stop();
    }
  });

  it('delivers from proxy.', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withPrintIndex(true)
      .withProxyUrl('http://main--foo--bar.hlx.page');

    await project.init();
    project.log.level = 'silly';

    nock('http://main--foo--bar.hlx.page')
      .get('/readme.html')
      .reply(200, 'hello readme', {
        'content-type': 'text/html',
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>', {
        'content-type': 'text/html',
      });

    try {
      await project.start();
      const resp = await fetch(`http://127.0.0.1:${project.server.port}/readme.html`, {
        cache: 'no-store',
      });
      const ret = await resp.text();
      assert.strictEqual(resp.status, 200);
      assert.strictEqual(ret.trim(), 'hello readme');
      assert.strictEqual(resp.headers.get('access-control-allow-origin'), '*');
      assert.strictEqual(resp.headers.get('via'), '1.0 main--foo--bar.hlx.page');
    } finally {
      await project.stop();
    }
  });

  it('delivers from proxy (with head).', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withPrintIndex(true)
      .withProxyUrl('http://main--foo--bar.hlx.page');

    await project.init();
    project.log.level = 'silly';

    nock('http://main--foo--bar.hlx.page')
      .get('/readme.html')
      .reply(200, '<html><head></head><body>hello readme</body></html>', {
        'content-type': 'text/html',
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>', {
        'content-type': 'text/html',
      });

    try {
      await project.start();
      const resp = await fetch(`http://127.0.0.1:${project.server.port}/readme.html`, {
        cache: 'no-store',
      });
      const ret = await resp.text();
      assert.strictEqual(resp.status, 200);
      assert.strictEqual(ret.trim(), '<html><head><meta property="hlx:proxyUrl" content="http://main--foo--bar.hlx.page/readme.html"></head><body>hello readme</body></html>');
      assert.strictEqual(resp.headers.get('access-control-allow-origin'), '*');
      assert.strictEqual(resp.headers.get('via'), '1.0 main--foo--bar.hlx.page');
    } finally {
      await project.stop();
    }
  });

  it('delivers filtered json from proxy.', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withPrintIndex(true)
      .withProxyUrl('http://main--foo--bar.hlx.page');

    await project.init();
    project.log.level = 'silly';

    nock('http://main--foo--bar.hlx.page')
      .get('/subfolder/query-index.json?sheet=foo&limit=20')
      .reply((uri) => {
        // note: nock has problems with malformed query strings. in fact, it should not match
        // a request like: /subfolder/query-index.json?sheet=foo&limit=20?sheet=foo&limit=20
        assert.strictEqual(uri, '/subfolder/query-index.json?sheet=foo&limit=20');
        return [200, '{ "data": [] }', { 'content-type': 'application/json' }];
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>', {
        'content-type': 'text/html',
      });

    try {
      await project.start();
      const resp = await fetch(`http://127.0.0.1:${project.server.port}/subfolder/query-index.json?sheet=foo&limit=20`, {
        cache: 'no-store',
      });
      assert.strictEqual(resp.status, 200);
      assert.deepStrictEqual(await resp.json(), { data: [] });
      assert.strictEqual(resp.headers.get('access-control-allow-origin'), '*');
      assert.strictEqual(resp.headers.get('via'), '1.0 main--foo--bar.hlx.page');
    } finally {
      await project.stop();
    }
  });
});
