/*
 * Copyright 2025 Adobe. All rights reserved.
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
import assert from 'assert';
import path from 'path';
import fse from 'fs-extra';
import { fileURLToPath } from 'url';
import WebSocket from 'faye-websocket';
import fetch from 'node-fetch';
import { setupProject } from './utils.js';
import { HelixProject } from '../src/server/HelixProject.js';

/* eslint-disable no-underscore-dangle */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __rootdir = path.resolve(__dirname, '..');
/* eslint-enable no-underscore-dangle */

// Helper to wait
const wait = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

describe('Server Live Reload for HTML Resources (Issue #2400)', () => {
  let testRoot;

  beforeEach(async () => {
    testRoot = await fse.mkdtemp(path.join(__dirname, 'tmp-'));
  });

  afterEach(async () => {
    await fse.remove(testRoot);
  });

  it('livereload works for regular .html files (not in HTML folder)', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    // Create a regular HTML file in the project root
    const htmlFile = path.join(cwd, 'test.html');
    await fse.writeFile(htmlFile, '<html><head></head><body>Initial HTML content</body></html>');

    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();

    try {
      await project.start();

      // Connect WebSocket client for live reload
      const wsUrl = `ws://127.0.0.1:${project.server.port}/__internal__/livereload`;
      const ws = new WebSocket.Client(wsUrl);

      const wsOpenPromise = new Promise((resolve) => {
        ws.on('open', resolve);
      });

      const wsReloadPromise = new Promise((resolve) => {
        ws.on('message', (event) => {
          const data = JSON.parse(event.data);
          if (data.command === 'reload') {
            resolve(data);
          }
        });
      });

      await wsOpenPromise;

      // Send hello command to establish connection
      ws.send(JSON.stringify({ command: 'hello' }));
      await wait(100);

      // Request the HTML file to register it with live reload
      const resp = await fetch(`http://127.0.0.1:${project.server.port}/test.html`);
      assert.strictEqual(resp.status, 200);
      const content = await resp.text();
      assert.ok(content.includes('Initial HTML content'), 'HTML content should be served');
      // Verify that livereload script is injected
      assert.ok(content.includes('/__internal__/livereload.js'), 'Livereload script should be injected');
      assert.ok(content.includes('window.LiveReloadOptions'), 'Livereload options should be injected');

      // Modify the HTML file
      await fse.writeFile(htmlFile, '<html><head></head><body>Updated HTML content</body></html>');

      // Wait for reload event
      const reloadData = await Promise.race([
        wsReloadPromise,
        wait(2000).then(() => null),
      ]);

      ws.close();

      // Verify reload event was triggered
      assert.ok(reloadData, 'Live reload event should have been triggered for HTML file');
      assert.strictEqual(reloadData.command, 'reload');
      assert.ok(
        reloadData.path === '/test.html' || reloadData.path.includes('test.html'),
        `Expected reload path to include test.html, got ${reloadData.path}`,
      );
    } finally {
      await project.stop();
    }
  });

  it('livereload works for .css files', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    // Create a CSS file in the project root
    const cssFile = path.join(cwd, 'styles.css');
    await fse.writeFile(cssFile, 'body { color: red; }');

    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();

    try {
      await project.start();

      // Connect WebSocket client for live reload
      const wsUrl = `ws://127.0.0.1:${project.server.port}/__internal__/livereload`;
      const ws = new WebSocket.Client(wsUrl);

      const wsOpenPromise = new Promise((resolve) => {
        ws.on('open', resolve);
      });

      const wsReloadPromise = new Promise((resolve) => {
        ws.on('message', (event) => {
          const data = JSON.parse(event.data);
          if (data.command === 'reload') {
            resolve(data);
          }
        });
      });

      await wsOpenPromise;

      // Send hello command to establish connection
      ws.send(JSON.stringify({ command: 'hello' }));
      await wait(100);

      // Request the CSS file to register it with live reload
      const resp = await fetch(`http://127.0.0.1:${project.server.port}/styles.css`);
      assert.strictEqual(resp.status, 200);

      // Modify the CSS file
      await fse.writeFile(cssFile, 'body { color: blue; }');

      // Wait for reload event
      const reloadData = await Promise.race([
        wsReloadPromise,
        wait(2000).then(() => null),
      ]);

      ws.close();

      // Verify reload event was triggered
      assert.ok(reloadData, 'Live reload event should have been triggered for CSS file');
      assert.strictEqual(reloadData.command, 'reload');
      assert.strictEqual(reloadData.liveCSS, true, 'CSS should have liveCSS flag set');
      assert.ok(
        reloadData.path === '/styles.css' || reloadData.path.includes('styles.css'),
        `Expected reload path to include styles.css, got ${reloadData.path}`,
      );
    } finally {
      await project.stop();
    }
  });

  it('livereload works for .js files', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    // Create a JS file in the project root
    const jsFile = path.join(cwd, 'script.js');
    await fse.writeFile(jsFile, 'console.log("initial");');

    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();

    try {
      await project.start();

      // Connect WebSocket client for live reload
      const wsUrl = `ws://127.0.0.1:${project.server.port}/__internal__/livereload`;
      const ws = new WebSocket.Client(wsUrl);

      const wsOpenPromise = new Promise((resolve) => {
        ws.on('open', resolve);
      });

      const wsReloadPromise = new Promise((resolve) => {
        ws.on('message', (event) => {
          const data = JSON.parse(event.data);
          if (data.command === 'reload') {
            resolve(data);
          }
        });
      });

      await wsOpenPromise;

      // Send hello command to establish connection
      ws.send(JSON.stringify({ command: 'hello' }));
      await wait(100);

      // Request the JS file to register it with live reload
      const resp = await fetch(`http://127.0.0.1:${project.server.port}/script.js`);
      assert.strictEqual(resp.status, 200);

      // Modify the JS file
      await fse.writeFile(jsFile, 'console.log("updated");');

      // Wait for reload event
      const reloadData = await Promise.race([
        wsReloadPromise,
        wait(2000).then(() => null),
      ]);

      ws.close();

      // Verify reload event was triggered
      assert.ok(reloadData, 'Live reload event should have been triggered for JS file');
      assert.strictEqual(reloadData.command, 'reload');
      assert.ok(
        reloadData.path === '/script.js' || reloadData.path.includes('script.js'),
        `Expected reload path to include script.js, got ${reloadData.path}`,
      );
    } finally {
      await project.stop();
    }
  });

  it('livereload works for nested .html files', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    // Create a nested HTML file
    const nestedDir = path.join(cwd, 'pages');
    await fse.ensureDir(nestedDir);
    const htmlFile = path.join(nestedDir, 'about.html');
    await fse.writeFile(htmlFile, '<html><head></head><body>About page</body></html>');

    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();

    try {
      await project.start();

      // Connect WebSocket client for live reload
      const wsUrl = `ws://127.0.0.1:${project.server.port}/__internal__/livereload`;
      const ws = new WebSocket.Client(wsUrl);

      const wsOpenPromise = new Promise((resolve) => {
        ws.on('open', resolve);
      });

      const wsReloadPromise = new Promise((resolve) => {
        ws.on('message', (event) => {
          const data = JSON.parse(event.data);
          if (data.command === 'reload') {
            resolve(data);
          }
        });
      });

      await wsOpenPromise;

      // Send hello command to establish connection
      ws.send(JSON.stringify({ command: 'hello' }));
      await wait(100);

      // Request the nested HTML file to register it with live reload
      const resp = await fetch(`http://127.0.0.1:${project.server.port}/pages/about.html`);
      assert.strictEqual(resp.status, 200);
      const content = await resp.text();
      assert.ok(content.includes('About page'), 'HTML content should be served');
      // Verify that livereload script is injected
      assert.ok(content.includes('/__internal__/livereload.js'), 'Livereload script should be injected in nested HTML');
      assert.ok(content.includes('window.LiveReloadOptions'), 'Livereload options should be injected in nested HTML');

      // Modify the HTML file
      await fse.writeFile(htmlFile, '<html><head></head><body>Updated about page</body></html>');

      // Wait for reload event
      const reloadData = await Promise.race([
        wsReloadPromise,
        wait(2000).then(() => null),
      ]);

      ws.close();

      // Verify reload event was triggered
      assert.ok(reloadData, 'Live reload event should have been triggered for nested HTML file');
      assert.strictEqual(reloadData.command, 'reload');
      assert.ok(
        reloadData.path === '/pages/about.html' || reloadData.path.includes('about.html'),
        `Expected reload path to include about.html, got ${reloadData.path}`,
      );
    } finally {
      await project.stop();
    }
  });
});
