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
import { getFetch } from '../src/fetch-utils.js';
import {
  assertHttp, createTestRoot, Nock, setupProject, wait,
} from './utils.js';

const require = createRequire(import.meta.url);
const fetch = getFetch();

describe('Browser Log Forwarding', () => {
  let testRoot;
  let nock;
  let logs;

  const testLogger = {
    debug: (...args) => logs.push({ level: 'debug', args }),
    info: (...args) => logs.push({ level: 'info', args }),
    warn: (...args) => logs.push({ level: 'warn', args }),
    error: (...args) => logs.push({ level: 'error', args }),
    log: (...args) => logs.push({ level: 'log', args }),
  };

  beforeEach(async () => {
    nock = new Nock();
    nock.enableNetConnect(/127.0.0.1/);
    testRoot = await createTestRoot();
    logs = [];
  });

  afterEach(async () => {
    if (os.platform() === 'win32') {
      fse.removeSync(testRoot);
    } else {
      await fse.remove(testRoot);
    }
    nock.done();
  });

  it('should inject console interceptor when enabled', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withForwardBrowserLogs(true)
      .withProxyUrl('http://main--foo--bar.aem.page')
      .withLogger(testLogger);
    await project.init();

    nock('http://main--foo--bar.aem.page')
      .get('/index.html')
      .reply(200, '<html><head></head><body>Test</body></html>', {
        'content-type': 'text/html',
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    try {
      await project.start();
      const response = await fetch(`http://127.0.0.1:${project.server.port}/index.html`);
      const html = await response.text();
      
      // Check that console interceptor script is injected
      assert(html.includes('// Store original console methods'), 'Console interceptor script should be injected');
      assert(html.includes('function serializeArgs'), 'Serialization function should be present');
      assert(html.includes('window.LiveReload.connector.socket.send'), 'WebSocket send should be present');
    } finally {
      await project.stop();
    }
  });

  it('should not inject script when disabled', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withForwardBrowserLogs(false)
      .withProxyUrl('http://main--foo--bar.aem.page')
      .withLogger(testLogger);
    await project.init();

    nock('http://main--foo--bar.aem.page')
      .get('/index.html')
      .reply(200, '<html><head></head><body>Test</body></html>', {
        'content-type': 'text/html',
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    try {
      await project.start();
      const response = await fetch(`http://127.0.0.1:${project.server.port}/index.html`);
      const html = await response.text();
      
      // Check that console interceptor script is NOT injected
      assert(!html.includes('// Store original console methods'), 'Console interceptor script should not be injected');
      assert(!html.includes('function serializeArgs'), 'Serialization function should not be present');
    } finally {
      await project.stop();
    }
  });

  it('should handle log command in WebSocket', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withForwardBrowserLogs(true)
      .withProxyUrl('http://main--foo--bar.aem.page')
      .withLogger(testLogger);
    await project.init();

    nock('http://main--foo--bar.aem.page')
      .get('/index.html')
      .reply(200, '<html><head></head><body>Test</body></html>', {
        'content-type': 'text/html',
      })
      .get('/head.html')
      .reply(200, '');

    try {
      await project.start();
      
      const ws = new WebSocket.Client(`ws://127.0.0.1:${project.server.port}/`);
      const wsOpenPromise = new Promise((resolve, reject) => {
        ws.on('open', () => {
          // Send hello command first
          ws.send(JSON.stringify({
            command: 'hello',
          }));
          
          // Send log command
          ws.send(JSON.stringify({
            command: 'log',
            level: 'error',
            args: ['Test error message', { foo: 'bar' }],
            url: 'http://localhost:3000/test.js',
            line: '42',
          }));
          
          resolve();
        });
        ws.on('error', reject);
      });

      await wsOpenPromise;
      await wait(100); // Give time for log to be processed
      ws.close();
      
      // Check that log was captured
      const browserLogs = logs.filter(log => 
        log.args.some(arg => 
          typeof arg === 'string' && arg.includes('[Browser:error]')
        )
      );
      
      assert(browserLogs.length > 0, 'Browser log should be captured');
      const logMessage = browserLogs[0].args.join(' ');
      assert(logMessage.includes('Test error message'), 'Log should contain the error message');
      assert(logMessage.includes('"foo": "bar"'), 'Log should contain the serialized object');
      assert(logMessage.includes('http://localhost:3000/test.js:42'), 'Log should contain the file location');
    } finally {
      await project.stop();
    }
  });

  it('should safely serialize complex objects', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withForwardBrowserLogs(true)
      .withLogger(testLogger);
    await project.init();

    try {
      await project.start();
      
      const ws = new WebSocket.Client(`ws://127.0.0.1:${project.server.port}/`);
      const wsOpenPromise = new Promise((resolve, reject) => {
        ws.on('open', () => {
          // Send hello command first
          ws.send(JSON.stringify({
            command: 'hello',
          }));
          
          // Create circular reference
          const circular = { a: 1 };
          circular.self = circular;
          
          // Send log with circular reference
          ws.send(JSON.stringify({
            command: 'log',
            level: 'log',
            args: ['Circular test', circular],
            url: 'http://localhost:3000/test.js',
            line: '10',
          }));
          
          resolve();
        });
        ws.on('error', reject);
      });

      await wsOpenPromise;
      await wait(100);
      ws.close();
      
      // Check that log was captured without crashing
      const browserLogs = logs.filter(log => 
        log.args.some(arg => 
          typeof arg === 'string' && arg.includes('[Browser:log]')
        )
      );
      
      assert(browserLogs.length > 0, 'Browser log should be captured');
      const logMessage = browserLogs[0].args.join(' ');
      assert(logMessage.includes('[Circular or Complex Object]'), 'Circular reference should be handled safely');
    } finally {
      await project.stop();
    }
  });

  it('should format browser logs with timestamp and location', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withLiveReload(true)
      .withForwardBrowserLogs(true)
      .withLogger(testLogger);
    await project.init();

    try {
      await project.start();
      
      const ws = new WebSocket.Client(`ws://127.0.0.1:${project.server.port}/`);
      const wsOpenPromise = new Promise((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            command: 'hello',
          }));
          
          ws.send(JSON.stringify({
            command: 'log',
            level: 'warn',
            args: ['Warning message'],
            url: 'http://localhost:3000/app.js',
            line: '123',
          }));
          
          resolve();
        });
        ws.on('error', reject);
      });

      await wsOpenPromise;
      await wait(100);
      ws.close();
      
      const browserLogs = logs.filter(log => 
        log.args.some(arg => 
          typeof arg === 'string' && arg.includes('[Browser:warn]')
        )
      );
      
      assert(browserLogs.length > 0, 'Browser log should be captured');
      const logMessage = browserLogs[0].args.join(' ');
      
      // Check format: [Browser:level] timestamp location message
      assert(logMessage.match(/\[Browser:warn\]/), 'Should have browser prefix with level');
      assert(logMessage.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/), 'Should have ISO timestamp');
      assert(logMessage.includes('http://localhost:3000/app.js:123'), 'Should have file location');
      assert(logMessage.includes('Warning message'), 'Should have the actual message');
    } finally {
      await project.stop();
    }
  });
});