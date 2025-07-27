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

/* eslint-env mocha, browser */

import { expect } from '@esm-bundle/chai';
import { executeServerCommand } from '@web/test-runner-commands';

describe('LiveReload Integration with Browser Logs', () => {
  let testServer;
  let testPort;

  before(async () => {
    // Start a test server with browser log forwarding enabled
    const result = await executeServerCommand('start-test-server', {
      forwardBrowserLogs: true,
    });
    testServer = result.server;
    testPort = result.port;
  });

  after(async () => {
    if (testServer) {
      await executeServerCommand('stop-test-server', { server: testServer });
    }
  });

  it('should inject console interceptor script in HTML responses', async () => {
    const response = await fetch(`http://localhost:${testPort}/test.html`);
    const html = await response.text();

    // Check that the interceptor script is injected
    expect(html).to.include('// Store original console methods');
    expect(html).to.include('function serializeArgs');
    expect(html).to.include('window.LiveReload.connector.socket.send');
  });

  it('should establish WebSocket connection and receive log commands', async () => {
    // Create WebSocket connection
    const ws = new WebSocket(`ws://localhost:${testPort}/`);
    const messages = [];

    await new Promise((resolve, reject) => {
      ws.onopen = () => {
        // Send hello command
        ws.send(JSON.stringify({ command: 'hello' }));
        resolve();
      };
      ws.onerror = reject;
    });

    ws.onmessage = (event) => {
      messages.push(JSON.parse(event.data));
    };

    // Send log command
    ws.send(JSON.stringify({
      command: 'log',
      level: 'error',
      args: ['Test error from browser'],
      url: window.location.href,
      line: '42',
    }));

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Close connection
    ws.close();

    // Check that hello response was received
    const helloResponse = messages.find(m => m.command === 'hello');
    expect(helloResponse).to.exist;
    expect(helloResponse.serverName).to.equal('aem-simulator');
  });

  it('should load livereload.js script', async () => {
    const response = await fetch(`http://localhost:${testPort}/__internal__/livereload.js`);
    expect(response.status).to.equal(200);
    
    const script = await response.text();
    expect(script).to.include('LiveReload');
  });

  it('should handle page with injected script and console forwarding', async () => {
    // Create an iframe to test the full integration
    const iframe = document.createElement('iframe');
    iframe.src = `http://localhost:${testPort}/test-page.html`;
    document.body.appendChild(iframe);

    await new Promise((resolve) => {
      iframe.onload = resolve;
    });

    // Get the iframe's window
    const iframeWindow = iframe.contentWindow;

    // Wait for LiveReload to be available
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (iframeWindow.LiveReload && iframeWindow.LiveReload.connector) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    // Check that console methods have been intercepted
    expect(iframeWindow.console.log).to.not.equal(iframeWindow.console.log.toString());

    // Clean up
    document.body.removeChild(iframe);
  });
});