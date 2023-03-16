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
import { createRequire } from 'module';
import os from 'os';
import assert from 'assert';
import fse from 'fs-extra';
import path from 'path';
import WebSocket from 'faye-websocket';
import { HelixProject } from '../src/server/HelixProject.js';
import {
  assertHttp, createTestRoot, Nock, setupProject, wait,
} from './utils.js';

const require = createRequire(import.meta.url);

describe('Helix Server with Livereload', () => {
  let testRoot;
  let nock;
  let CODESPACES_ORIGINAL;

  beforeEach(async () => {
    nock = new Nock();
    nock.enableNetConnect(/127.0.0.1/);
    testRoot = await createTestRoot();
    CODESPACES_ORIGINAL = process.env.CODESPACES;
  });

  afterEach(async () => {
    process.env.CODESPACES = CODESPACES_ORIGINAL;
    if (os.platform() === 'win32') {
      // Note: the async variant of remove hangs on windows, probably due to open filehandle to
      // logs/request.log
      fse.removeSync(testRoot);
    } else {
      await fse.remove(testRoot);
    }
    nock.done();
  });

  it('deliver livereload script', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true);
    await project.init();
    try {
      await project.start();
      await assertHttp(`http://127.0.0.1:${project.server.port}/__internal__/livereload.js`, 200, require.resolve('livereload-js/dist/livereload.js'));
    } finally {
      await project.stop();
    }
  });

  it('deliver rendered resource with live reload injected in head', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.hlx.page');
    await project.init();

    nock('http://main--foo--bar.hlx.page')
      .get('/live/index.html')
      .optionally(true)
      .reply(200, '<html><head>Test</head><body>Hello, world. path=/index.md, strain=default</body></html>', {
        'content-type': 'text/html',
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    try {
      await project.start();
      await assertHttp(`http://127.0.0.1:${project.server.port}/live/index.html`, 200, 'expected_index_w_lr.html', [{
        pattern: 'PORT',
        with: project.server.port,
      }]);
    } finally {
      await project.stop();
    }
  });

  it('deliver rendered resource with live reload injected in body', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.hlx.page');
    await project.init();

    nock('http://main--foo--bar.hlx.page')
      .get('/live/index.html')
      .optionally(true)
      .reply(200, '<html><body>Hello, world. path=/index.md, strain=default</body></html>', {
        'content-type': 'text/html',
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    try {
      await project.start();
      await assertHttp(`http://127.0.0.1:${project.server.port}/live/index.html`, 200, 'expected_index_w_lr_nohead.html', [{
        pattern: 'PORT',
        with: project.server.port,
      }]);
    } finally {
      await project.stop();
    }
  });

  it('deliver rendered resource with live reload injected in body for codespaces', async () => {
    process.env.CODESPACES = 'true';
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.hlx.page');
    await project.init();

    nock('http://main--foo--bar.hlx.page')
      .get('/live/index.html')
      .optionally(true)
      .reply(200, '<html><body>Hello, world. path=/index.md, strain=default</body></html>', {
        'content-type': 'text/html',
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    try {
      await project.start();
      await assertHttp(`http://127.0.0.1:${project.server.port}/live/index.html`, 200, 'expected_index_w_lr_nohead_codespaces.html');
    } finally {
      await project.stop();
    }
  });

  it('deliver rendered resource with live reload injected in html', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.hlx.page');
    await project.init();

    nock('http://main--foo--bar.hlx.page')
      .get('/live/index.html')
      .optionally(true)
      .reply(200, '<html>Hello, world. path=/index.md, strain=default</html>', {
        'content-type': 'text/html',
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    try {
      await project.start();
      await assertHttp(`http://127.0.0.1:${project.server.port}/live/index.html`, 200, 'expected_index_w_lr_nobody.html', [{
        pattern: 'PORT',
        with: project.server.port,
      }]);
    } finally {
      await project.stop();
    }
  });

  it('deliver rendered resource with live reload no injected with no html', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.hlx.page');

    nock('http://main--foo--bar.hlx.page')
      .get('/live/index.html')
      .optionally(true)
      .reply(200, 'Hello, world. path=/index.md, strain=default', {
        'content-type': 'text/html',
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    await project.init();
    try {
      await project.start();
      await assertHttp(`http://127.0.0.1:${project.server.port}/live/index.html`, 200, 'expected_index_w_lr_nohtml.html');
    } finally {
      await project.stop();
    }
  });

  it('livereload informs clients when file is modified', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.hlx.page');
    await project.init();

    nock('http://main--foo--bar.hlx.page')
      .get('/live/index.html')
      .reply(200, '<html><head>Test</head><body>Hello, world. path=/index.md, strain=default</body></html>', {
        'content-type': 'text/html',
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');
    try {
      await project.start();

      await assertHttp(`http://127.0.0.1:${project.server.port}/live/index.html`, 200, 'expected_index_w_lr.html', [{
        pattern: 'PORT',
        with: project.server.port,
      }]);

      const ws = new WebSocket.Client(`ws://127.0.0.1:${project.server.port}/`);
      let wsReloadData = null;
      let wsHelloData = null;
      const wsOpenPromise = new Promise((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            command: 'hello',
          }));
          ws.send(JSON.stringify({
            command: 'info',
            plugins: [],
            url: `http://127.0.0.1:${project.server.port}/styles.css`,
          }));
          resolve();
        });
        ws.on('error', reject);
        ws.on('close', resolve);
      });
      const wsPromise = new Promise((resolve, reject) => {
        ws.on('message', (event) => {
          const data = JSON.parse(event.data);
          // console.log(data);
          if (data.command === 'hello') {
            wsHelloData = data;
          } else if (data.command === 'reload') {
            wsReloadData = data;
          } else {
            reject(new Error(`unexpected message: ${event.data}`));
          }
        });
        ws.on('error', reject);
        ws.on('close', resolve);
      });

      await assertHttp(`http://127.0.0.1:${project.server.port}/styles.css`, 200, 'expected_styles.css');
      await wsOpenPromise;
      await fse.copy(path.resolve(cwd, 'styles-modified.css'), path.resolve(cwd, 'styles.css'));
      await wait(500);
      ws.close();
      // ensure socket properly closes
      await wsPromise;

      // assert no error
      assert.deepEqual(wsHelloData, {
        command: 'hello',
        protocols: [
          'http://livereload.com/protocols/official-7',
        ],
        serverName: 'franklin-simulator',
      });
      assert.deepEqual(wsReloadData, {
        command: 'reload',
        liveCSS: true,
        liveImg: true,
        path: '/styles.css',
        reloadMissingCSS: true,
      });
    } finally {
      await project.stop();
    }
  });

  it('livereload informs clients via alert', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.hlx.page');

    await project.init();
    nock('http://main--foo--bar.hlx.page')
      .get('/live/index.html')
      .reply(200, '<html><head>Test</head><body>Hello, world. path=/index.md, strain=default</body></html>', {
        'content-type': 'text/html',
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    try {
      await project.start();
      await assertHttp(`http://127.0.0.1:${project.server.port}/live/index.html`, 200, 'expected_index_w_lr.html', [{
        pattern: 'PORT',
        with: project.server.port,
      }]);

      const ws = new WebSocket.Client(`ws://127.0.0.1:${project.server.port}/`);
      let wsAlertData = null;
      let wsHelloData = null;
      const wsOpenPromise = new Promise((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            command: 'hello',
          }));
          ws.send(JSON.stringify({
            command: 'info',
            plugins: [],
            url: `http://127.0.0.1:${project.server.port}/index.html`,
          }));
          resolve();
        });
        ws.on('error', reject);
        ws.on('close', resolve);
      });
      const wsPromise = new Promise((resolve, reject) => {
        ws.on('message', (event) => {
          const data = JSON.parse(event.data);
          // console.log(data);
          if (data.command === 'hello') {
            wsHelloData = data;
          } else if (data.command === 'alert') {
            wsAlertData = data;
          } else {
            reject(new Error(`unexpected message: ${event.data}`));
          }
        });
        ws.on('error', reject);
        ws.on('close', resolve);
      });

      await wsOpenPromise;
      project.liveReload.alert('hello alert');
      await wait(500);
      ws.close();
      // ensure socket properly closes
      await wsPromise;

      // assert no error
      assert.deepEqual(wsHelloData, {
        command: 'hello',
        protocols: [
          'http://livereload.com/protocols/official-7',
        ],
        serverName: 'franklin-simulator',
      });
      assert.deepEqual(wsAlertData, {
        command: 'alert',
        message: 'hello alert',
      });
    } finally {
      await project.stop();
    }
  });

  it('livereload of a query definition should not cause an unhandled rejection when no last URL exists', async () => {
    const rejects = [];
    process.on('unhandledRejection', (reason) => {
      rejects.push(reason);
    });

    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withPrintIndex(true);
    await project.init();

    try {
      await project.start();

      await fse.copy(path.resolve(cwd, 'helix-query-modified.yaml'), path.resolve(cwd, 'helix-query.yaml'));
      await wait(500);

      if (rejects.length > 0) {
        assert.fail(rejects[0]);
      }
    } finally {
      await project.stop();
    }
  });
});
