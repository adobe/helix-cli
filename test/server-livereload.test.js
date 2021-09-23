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
process.env.HELIX_FETCH_FORCE_HTTP1 = 'true';

const os = require('os');
const assert = require('assert');
const fse = require('fs-extra');
const path = require('path');
const nock = require('nock');
const WebSocket = require('faye-websocket');
const HelixProject = require('../src/server/HelixProject.js');
const {
  createTestRoot, setupProject, wait, assertHttp,
} = require('./utils.js');

describe('Helix Server with Livereload', () => {
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

  it('deliver livereload script', async () => {
    const cwd = await setupProject(path.join(__dirname, 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true);
    await project.init();
    try {
      await project.start();
      await assertHttp(`http://localhost:${project.server.port}/__internal__/livereload.js`, 200, require.resolve('livereload-js/dist/livereload.js'));
    } finally {
      await project.stop();
    }
  });

  it('deliver rendered resource with live reload injected in head', async () => {
    const cwd = await setupProject(path.join(__dirname, 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.hlx3.page');
    await project.init();

    const scope = nock('http://main--foo--bar.hlx3.page')
      .get('/live/index.html')
      .optionally(true)
      .reply(200, '<html><head>Test</head><body>Hello, world. path=/index.md, strain=default</body></html>', {
        'content-type': 'text/html',
      });

    try {
      await project.start();
      await assertHttp(`http://localhost:${project.server.port}/live/index.html`, 200, 'expected_index_w_lr.html');
    } finally {
      await project.stop();
      scope.done();
    }
  });

  it('deliver rendered resource with live reload injected in body', async () => {
    const cwd = await setupProject(path.join(__dirname, 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.hlx3.page');
    await project.init();

    const scope = nock('http://main--foo--bar.hlx3.page')
      .get('/live/index.html')
      .optionally(true)
      .reply(200, '<html><body>Hello, world. path=/index.md, strain=default</body></html>', {
        'content-type': 'text/html',
      });

    try {
      await project.start();
      await assertHttp(`http://localhost:${project.server.port}/live/index.html`, 200, 'expected_index_w_lr_nohead.html');
    } finally {
      await project.stop();
      scope.done();
    }
  });

  it('deliver rendered resource with live reload injected in html', async () => {
    const cwd = await setupProject(path.join(__dirname, 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.hlx3.page');
    await project.init();

    const scope = nock('http://main--foo--bar.hlx3.page')
      .get('/live/index.html')
      .optionally(true)
      .reply(200, '<html>Hello, world. path=/index.md, strain=default</html>', {
        'content-type': 'text/html',
      });

    try {
      await project.start();
      await assertHttp(`http://localhost:${project.server.port}/live/index.html`, 200, 'expected_index_w_lr_nobody.html');
    } finally {
      await project.stop();
      scope.done();
    }
  });

  it('deliver rendered resource with live reload no injected with no html', async () => {
    const cwd = await setupProject(path.join(__dirname, 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.hlx3.page');

    const scope = nock('http://main--foo--bar.hlx3.page')
      .get('/live/index.html')
      .optionally(true)
      .reply(200, 'Hello, world. path=/index.md, strain=default', {
        'content-type': 'text/html',
      });

    await project.init();
    try {
      await project.start();
      await assertHttp(`http://localhost:${project.server.port}/live/index.html`, 200, 'expected_index_w_lr_nohtml.html');
    } finally {
      await project.stop();
      scope.done();
    }
  });

  it('livereload informs clients when file is modified', async () => {
    const cwd = await setupProject(path.join(__dirname, 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.hlx3.page');
    await project.init();

    const scope = nock('http://main--foo--bar.hlx3.page')
      .get('/live/index.html')
      .reply(200, '<html><head>Test</head><body>Hello, world. path=/index.md, strain=default</body></html>', {
        'content-type': 'text/html',
      });
    try {
      await project.start();

      await assertHttp(`http://localhost:${project.server.port}/live/index.html`, 200, 'expected_index_w_lr.html');

      const ws = new WebSocket.Client(`ws://localhost:${project.server.port}/`);
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
            url: `http://localhost:${project.server.port}/styles.css`,
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

      await assertHttp(`http://localhost:${project.server.port}/styles.css`, 200, 'expected_styles.css');
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
        serverName: 'helix-simulator',
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
      scope.done();
    }
  });

  it('livereload informs clients via alert', async () => {
    const cwd = await setupProject(path.join(__dirname, 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.hlx3.page');

    await project.init();
    const scope = nock('http://main--foo--bar.hlx3.page')
      .get('/live/index.html')
      .reply(200, '<html><head>Test</head><body>Hello, world. path=/index.md, strain=default</body></html>', {
        'content-type': 'text/html',
      });

    try {
      await project.start();
      await assertHttp(`http://localhost:${project.server.port}/live/index.html`, 200, 'expected_index_w_lr.html');

      const ws = new WebSocket.Client(`ws://localhost:${project.server.port}/`);
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
            url: `http://localhost:${project.server.port}/index.html`,
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
      project._liveReload.alert('hello alert');
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
        serverName: 'helix-simulator',
      });
      assert.deepEqual(wsAlertData, {
        command: 'alert',
        message: 'hello alert',
      });
    } finally {
      await project.stop();
      scope.done();
    }
  });
});
