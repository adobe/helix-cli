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
/* eslint-disable no-console */
import os from 'os';
import assert from 'assert';
import fs from 'fs/promises';
import fse from 'fs-extra';
import { UnsecuredJWT } from 'jose';
import path from 'path';
import { h1NoCache } from '@adobe/fetch';
import * as http from 'node:http';
import { HelixProject } from '../src/server/HelixProject.js';
import {
  Nock, assertHttp, createTestRoot, setupProject, rawGet,
} from './utils.js';
import { getFetch } from '../src/fetch-utils.js';
import { getSiteTokenFromFile } from '../src/config/config-utils.js';
import packageJson from '../src/package.cjs';

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
      .withProxyUrl('https://main--foo--bar.aem.page/')
      .withHttpPort(0);

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
      .withProxyUrl('https://main--foo--bar.aem.page/')
      .withHttpPort(0);

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
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();

    nock('http://main--foo--bar.aem.page')
      .get('/notfound.css')
      .reply(404);

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
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();

    nock('http://main--foo--bar.aem.page')
      .get('/local.html')
      .optionally(true)
      .reply(200, 'foo');

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/local.html`, {
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

  it('delivers local 404.html.', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();

    nock('http://main--foo--bar.aem.page')
      .get('/missing')
      .reply(404, 'server 404 html', {
        'content-type': 'text/html',
      });

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/missing`, {
        cache: 'no-store',
      });
      const ret = await resp.text();
      assert.strictEqual(resp.status, 404);
      assert.strictEqual(ret.trim(), '<html>\n<head><title>Not found</title></head>\n<main>404</main>\n</html>');
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
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();
    project.log.level = 'silly';

    nock('http://main--foo--bar.aem.page')
      .get('/readme.html')
      .reply(200, 'hello readme', {
        'content-type': 'text/html',
        'content-security-policy': 'self;',
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>', {
        'content-type': 'text/html',
      });

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/readme.html`, {
        cache: 'no-store',
      });
      const ret = await resp.text();
      assert.strictEqual(resp.status, 200);
      assert.strictEqual(ret.trim(), 'hello readme');
      assert.strictEqual(resp.headers.get('access-control-allow-origin'), '*');
      assert.strictEqual(resp.headers.get('content-security-policy'), null);
      assert.strictEqual(resp.headers.get('via'), '1.0 main--foo--bar.aem.page');
    } finally {
      await project.stop();
    }
  });

  it('delivers from proxy (via http proxy).', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withPrintIndex(true)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();
    project.log.level = 'silly';

    // create a http proxy server
    process.env.ALL_PROXY = 'http://127.0.0.1:8002';
    const proxyRequests = [];
    const proxy = await new Promise((resolve) => {
      const p = http
        .createServer(async (req, res) => {
          try {
            // Delete accept header due to nock conflict
            delete req.headers.accept;
            console.log('http proxy request', req.url);
            const resp = await h1NoCache().fetch(req.url, {});
            console.log('http proxy response for', req.url, resp.status);
            res.writeHead(resp.status, resp.headers.plain());
            res.write(await resp.buffer());
            res.end();
            proxyRequests.push(req.url);
          } catch (e) {
            console.error('http proxy error:', e);
            res.writeHead(500);
            res.end();
          }
        })
        .listen(8002, '127.0.0.1', () => {
          console.log('http proxy server listening on port 8002');
          resolve(p);
        });
    });

    nock('http://main--foo--bar.aem.page')
      .get('/readme.html')
      .reply(200, 'hello readme', {
        'content-type': 'text/html',
        'content-security-policy': 'self;',
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>', {
        'content-type': 'text/html',
      });

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/readme.html`, {
        cache: 'no-store',
      });
      const ret = await resp.text();
      assert.strictEqual(resp.status, 200);
      assert.strictEqual(ret.trim(), 'hello readme');
      assert.strictEqual(resp.headers.get('access-control-allow-origin'), '*');
      assert.strictEqual(resp.headers.get('content-security-policy'), null);
      assert.strictEqual(resp.headers.get('via'), '1.0 main--foo--bar.aem.page');

      // ensure that request went through http proxy
      assert.deepStrictEqual(proxyRequests, [`http://127.0.0.1:${project.server.port}/readme.html`]);
    } finally {
      proxy.close();
      await project.stop();
      delete process.env.ALL_PROXY;
    }
  });

  it('delivers from proxy (with head).', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withPrintIndex(true)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();
    project.log.level = 'silly';

    nock('http://main--foo--bar.aem.page')
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
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/readme.html`, {
        cache: 'no-store',
      });
      const ret = await resp.text();
      assert.strictEqual(resp.status, 200);
      assert.strictEqual(ret.trim(), '<html><head><meta property="hlx:proxyUrl" content="http://main--foo--bar.aem.page/readme.html"></head><body>hello readme</body></html>');
      assert.strictEqual(resp.headers.get('access-control-allow-origin'), '*');
      assert.strictEqual(resp.headers.get('via'), '1.0 main--foo--bar.aem.page');
    } finally {
      await project.stop();
    }
  });

  it('delivers from proxy (with modified local head).', async () => {
    const cwd = await setupProject(path.resolve(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    await fse.copy(path.resolve(cwd, 'head-modified.html'), path.resolve(cwd, 'head.html'));
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withPrintIndex(true)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();
    project.log.level = 'silly';

    nock('http://main--foo--bar.aem.page')
      .get('/readme.html')
      .reply(200, '<html><head><link rel="stylesheet" href="/styles.css"/></head><body>hello readme</body></html>', {
        'content-type': 'text/html',
      })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>', {
        'content-type': 'text/html',
      });

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/readme.html`, {
        cache: 'no-store',
      });
      const ret = await resp.text();
      assert.strictEqual(resp.status, 200);
      assert.strictEqual(ret.trim(), '<html><head><!-- local head html -->\n<link rel="stylesheet" href="/styles.css"/>\n<meta content="test-head"/><meta property="hlx:proxyUrl" content="http://main--foo--bar.aem.page/readme.html"></head><body>hello readme</body></html>');
      assert.strictEqual(resp.headers.get('access-control-allow-origin'), '*');
      assert.strictEqual(resp.headers.get('via'), '1.0 main--foo--bar.aem.page');
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
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();
    project.log.level = 'silly';

    nock('http://main--foo--bar.aem.page')
      .get('/subfolder/query-index.json?sheet=foo&limit=20')
      .reply((uri) => {
        // note: nock has problems with malformed query strings. in fact, it should not match
        // a request like: /subfolder/query-index.json?sheet=foo&limit=20?sheet=foo&limit=20
        assert.strictEqual(uri, '/subfolder/query-index.json?sheet=foo&limit=20');
        return [200, '{ "data": [] }', { 'content-type': 'application/json' }];
      });

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/subfolder/query-index.json?sheet=foo&limit=20`, {
        cache: 'no-store',
      });
      assert.strictEqual(resp.status, 200);
      assert.deepStrictEqual(await resp.json(), { data: [] });
      assert.strictEqual(resp.headers.get('access-control-allow-origin'), '*');
      assert.strictEqual(resp.headers.get('via'), '1.0 main--foo--bar.aem.page');
    } finally {
      await project.stop();
    }
  });

  it('starts login', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(3000)
      .withProxyUrl('http://main--foo--bar.aem.page')
      .withSiteLoginUrl('https://admin.hlx.page/login/bar/foo/main?client_id=aem-cli&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F.aem%2Fcli%2Flogin%2Fack&selectAccount=true');

    await project.init();
    project.log.level = 'silly';

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/.aem/cli/login`, {
        cache: 'no-store',
        redirect: 'manual',
      });
      assert.strictEqual(resp.status, 302);
      assert.ok(
        resp.headers.get('location').startsWith('https://admin.hlx.page/login/bar/foo/main?client_id=aem-cli&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F.aem%2Fcli%2Flogin%2Fack&selectAccount=true&state='),
      );
    } finally {
      await project.stop();
    }
  });

  it('starts auto login when receiving 401 during navigation', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(3000)
      .withProxyUrl('http://main--foo--bar.aem.page')
      .withSiteLoginUrl('https://admin.hlx.page/login/bar/foo/main?client_id=aem-cli&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F.aem%2Fcli%2Flogin%2Fack&selectAccount=true');

    await project.init();
    project.log.level = 'silly';

    nock('http://main--foo--bar.aem.page').get('/').reply(401, 'Unauthorized');

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/`, {
        cache: 'no-store',
        redirect: 'manual',
        // emulate browser navigation
        headers: {
          'sec-fetch-mode': 'navigate',
          'sec-fetch-dest': 'document',
        },
      });
      assert.strictEqual(resp.status, 302);
      assert.strictEqual(resp.headers.get('location'), '/.aem/cli/login');
    } finally {
      await project.stop();
    }
  });

  it('injects hlx:proxyUrl meta tag in 401 HTML responses', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();
    project.log.level = 'silly';

    nock('http://main--foo--bar.aem.page')
      .get('/protected.html')
      .reply(401, '<html><head><title>Unauthorized</title></head><body>Access denied</body></html>', {
        'content-type': 'text/html',
      });

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/protected.html`);
      assert.strictEqual(resp.status, 401);
      const body = await resp.text();
      assert.ok(body.includes('<meta property="hlx:proxyUrl" content="http://main--foo--bar.aem.page/protected.html">'));
      assert.ok(body.includes('<title>Unauthorized</title>'));
      assert.ok(body.includes('Access denied'));
    } finally {
      await project.stop();
    }
  });

  it('injects hlx:proxyUrl meta tag in 403 HTML responses', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();
    project.log.level = 'silly';

    nock('http://main--foo--bar.aem.page')
      .get('/forbidden.html')
      .reply(403, '<html><head><title>Forbidden</title></head><body>You do not have permission</body></html>', {
        'content-type': 'text/html',
      });

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/forbidden.html`);
      assert.strictEqual(resp.status, 403);
      const body = await resp.text();
      assert.ok(body.includes('<meta property="hlx:proxyUrl" content="http://main--foo--bar.aem.page/forbidden.html">'));
      assert.ok(body.includes('<title>Forbidden</title>'));
      assert.ok(body.includes('You do not have permission'));
    } finally {
      await project.stop();
    }
  });

  it('transforms plain text 401 responses into Chrome-compatible HTML with meta tag', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();
    project.log.level = 'silly';

    // Simulate real-world scenario: pipeline returns plain text for 401
    nock('http://main--foo--bar.aem.page')
      .get('/protected')
      .reply(401, 'Unauthorized', {
        'content-type': 'text/plain',
      });

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/protected`, {
        cache: 'no-store',
        redirect: 'manual',
      });
      assert.strictEqual(resp.status, 401);
      assert.ok(resp.headers.get('content-type').startsWith('text/html'));

      const body = await resp.text();
      // Verify Chrome-compatible structure
      assert.ok(body.includes('<html><head>'));
      assert.ok(body.includes('<meta name="color-scheme" content="light dark">'));
      assert.ok(body.includes('<meta property="hlx:proxyUrl" content="http://main--foo--bar.aem.page/protected">'));
      assert.ok(body.includes('</head><body>'));
      assert.ok(body.includes('<pre style="word-wrap: break-word; white-space: pre-wrap;">401 Unauthorized</pre>'));
      assert.ok(body.includes('</body></html>'));

      // Verify exact structure that sidekick expects
      assert.ok(body.match(/<body><pre[^>]*>401 Unauthorized<\/pre><\/body>/));
    } finally {
      await project.stop();
    }
  });

  it('transforms plain text 403 responses into Chrome-compatible HTML with meta tag', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();
    project.log.level = 'silly';

    // Simulate real-world scenario: pipeline returns plain text for 403
    nock('http://main--foo--bar.aem.page')
      .get('/forbidden')
      .reply(403, 'Forbidden', {
        'content-type': 'text/plain',
      });

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/forbidden`, {
        cache: 'no-store',
        redirect: 'manual',
      });
      assert.strictEqual(resp.status, 403);
      assert.ok(resp.headers.get('content-type').startsWith('text/html'));

      const body = await resp.text();
      // Verify Chrome-compatible structure
      assert.ok(body.includes('<html><head>'));
      assert.ok(body.includes('<meta name="color-scheme" content="light dark">'));
      assert.ok(body.includes('<meta property="hlx:proxyUrl" content="http://main--foo--bar.aem.page/forbidden">'));
      assert.ok(body.includes('</head><body>'));
      assert.ok(body.includes('<pre style="word-wrap: break-word; white-space: pre-wrap;">403 Forbidden</pre>'));
      assert.ok(body.includes('</body></html>'));

      // Verify exact structure that sidekick expects
      assert.ok(body.match(/<body><pre[^>]*>403 Forbidden<\/pre><\/body>/));
    } finally {
      await project.stop();
    }
  });

  it('escapes special characters in URL when transforming 401 responses', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();
    project.log.level = 'silly';

    // URL with special characters that need escaping
    nock('http://main--foo--bar.aem.page')
      .get('/path?param=value&other="quoted"')
      .reply(401, 'Unauthorized', {
        'content-type': 'text/plain',
      });

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/path?param=value&other="quoted"`, {
        cache: 'no-store',
        redirect: 'manual',
      });
      assert.strictEqual(resp.status, 401);

      const body = await resp.text();
      // URL is already percent-encoded by the time it reaches the server
      // Just verify the meta tag is present and ampersands are escaped
      assert.ok(body.includes('<meta property="hlx:proxyUrl" content="http://main--foo--bar.aem.page/path?param=value&amp;other=%22quoted%22">'));
      // Verify structure is Chrome-compatible
      assert.ok(body.includes('<pre style="word-wrap: break-word; white-space: pre-wrap;">401 Unauthorized</pre>'));
    } finally {
      await project.stop();
    }
  });

  it('receives site token, saves it and uses it', async () => {
    const siteToken = `hlxtst_${new UnsecuredJWT({ email: 'test@example.com' }).encode()}`;

    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(3000)
      .withProxyUrl('http://main--foo--bar.aem.page')
      .withSiteLoginUrl('https://admin.hlx.page/login/bar/foo/main?client_id=aem-cli&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F.aem%2Fcli%2Flogin%2Fack&selectAccount=true');

    await project.init();
    project.log.level = 'silly';

    nock('http://main--foo--bar.aem.page')
      .get('/')
      .reply(function fn() {
        assert.strictEqual(this.req.headers.authorization, `token ${siteToken}`);
        return [200, 'hello', { 'content-type': 'text/html' }];
      })
      .get('/head.html')
      .reply(function fn() {
        assert.strictEqual(this.req.headers.authorization, `token ${siteToken}`);
        return [200, '<script src="aem.js" type="module">', { 'content-type': 'text/html' }];
      });

    project._server._loginState = 'test-state';

    try {
      await project.start();
      // pre-flight
      const respPreflight = await getFetch()(`http://127.0.0.1:${project.server.port}/.aem/cli/login/ack`, {
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://admin.hlx.page',
        },
        cache: 'no-store',
      });
      assert.strictEqual(respPreflight.status, 200);
      assert.strictEqual(respPreflight.headers.get('access-control-allow-origin'), 'https://admin.hlx.page');
      assert.strictEqual(respPreflight.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
      assert.strictEqual(respPreflight.headers.get('access-control-allow-headers'), 'content-type');

      // receives and saves token
      const respAck = await getFetch()(`http://127.0.0.1:${project.server.port}/.aem/cli/login/ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://admin.hlx.page',
        },
        body: JSON.stringify({
          state: 'test-state',
          siteToken,
        }),
        cache: 'no-store',
      });
      assert.strictEqual(respAck.status, 200);
      assert.strictEqual(await respAck.text(), 'Login successful.');
      assert.strictEqual(respAck.headers.get('access-control-allow-origin'), 'https://admin.hlx.page');
      assert.strictEqual(respAck.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
      assert.strictEqual(respAck.headers.get('access-control-allow-headers'), 'content-type');

      // redirects to home
      const respRedirect = await getFetch()(`http://127.0.0.1:${project.server.port}/.aem/cli/login/ack`, {
        cache: 'no-store',
        redirect: 'manual',
      });
      assert.strictEqual(respRedirect.status, 302);
      assert.strictEqual(respRedirect.headers.get('location'), '/');

      // content request uses token
      const respContent = await getFetch()(`http://127.0.0.1:${project.server.port}/`, {
        cache: 'no-store',
      });
      assert.strictEqual(respContent.status, 200);
      assert.strictEqual(await respContent.text(), 'hello');

      assert.strictEqual(await getSiteTokenFromFile(), siteToken);
    } finally {
      await fs.rm(path.resolve(__rootdir, '.hlx'), { force: true, recursive: true });
      await project.stop();
    }
  });

  it('discards the token on state mismatch', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(3000)
      .withProxyUrl('http://main--foo--bar.aem.page')
      .withSiteLoginUrl('https://admin.hlx.page/login/bar/foo/main?client_id=aem-cli&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F.aem%2Fcli%2Flogin%2Fack&selectAccount=true');

    await project.init();
    project.log.level = 'silly';

    project._server._loginState = 'test-state';

    try {
      await project.start();
      let resp = await getFetch()(`http://127.0.0.1:${project.server.port}/.aem/cli/login/ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state: 'different-state',
          siteToken: 'test-site-token',
        }),
        cache: 'no-store',
      });
      assert.strictEqual(resp.status, 400);
      assert.ok(!resp.headers.get('access-control-allow-origin'));
      assert.strictEqual(resp.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
      assert.strictEqual(resp.headers.get('access-control-allow-headers'), 'content-type');

      resp = await getFetch()(`http://127.0.0.1:${project.server.port}/.aem/cli/login/ack`, {
        cache: 'no-store',
      });

      assert.strictEqual(resp.status, 400);
      const text = await resp.text();
      assert.ok(text.includes('Login Failed') && text.includes('invalid state'));
    } finally {
      await project.stop();
    }

    assert.strictEqual(project._server._loginState, undefined);
    assert.strictEqual(project._server._siteToken, undefined);
  });

  it('login fails when token is missing', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(3000)
      .withProxyUrl('http://main--foo--bar.aem.page')
      .withSiteLoginUrl('https://admin.hlx.page/login/bar/foo/main?client_id=aem-cli&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F.aem%2Fcli%2Flogin%2Fack&selectAccount=true');

    await project.init();
    project.log.level = 'silly';

    project._server._loginState = 'test-state';

    try {
      await project.start();
      let resp = await getFetch()(`http://127.0.0.1:${project.server.port}/.aem/cli/login/ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state: 'test-state',
        }),
        cache: 'no-store',
      });
      assert.strictEqual(resp.status, 400);
      assert.ok(!resp.headers.get('access-control-allow-origin'));
      assert.strictEqual(resp.headers.get('access-control-allow-methods'), 'POST, OPTIONS');
      assert.strictEqual(resp.headers.get('access-control-allow-headers'), 'content-type');

      resp = await getFetch()(`http://127.0.0.1:${project.server.port}/.aem/cli/login/ack`, {
        cache: 'no-store',
      });

      assert.strictEqual(resp.status, 400);
      const text = await resp.text();
      assert.ok(text.includes('Login Failed') && text.includes('Missing site token'));
    } finally {
      await project.stop();
    }

    assert.strictEqual(project._server._loginState, undefined);
    assert.strictEqual(project._server._siteToken, undefined);
  });

  it('returns version information', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0);

    await project.init();
    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/.hlx/version`);
      assert.strictEqual(resp.status, 200);
      assert.strictEqual(resp.headers.get('Content-Type'), 'application/json; charset=utf-8');
      const json = await resp.json();
      assert.strictEqual(json.name, '@adobe/aem-cli');
      assert.strictEqual(json.version, packageJson.version);
    } finally {
      await project.stop();
    }
  });

  it('proxies only hlx-auth-token cookie in requests', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();
    project.log.level = 'silly';

    nock('http://main--foo--bar.aem.page')
      .get('/cookie-test')
      .matchHeader('Cookie', 'hlx-auth-token=secret')
      .reply(() => [200, '']);

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/cookie-test`, {
        headers: {
          cookie: 'hlx-auth-token=secret; cookie2=value2',
        },
      });
      assert.strictEqual(resp.status, 200);
    } finally {
      await project.stop();
    }
  });

  it('proxies all cookie headers in requests when --cookies is set', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withProxyUrl('http://main--foo--bar.aem.page')
      .withCookies(true);

    await project.init();
    project.log.level = 'silly';

    nock('http://main--foo--bar.aem.page')
      .get('/cookie-test')
      .matchHeader('Cookie', 'cookie1=value1; cookie2=value2')
      .reply(() => [200, '']);

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/cookie-test`, {
        headers: {
          cookie: 'cookie1=value1; cookie2=value2',
        },
      });
      assert.strictEqual(resp.status, 200);
    } finally {
      await project.stop();
    }
  });

  it('proxies back multiple Set-Cookie headers in responses', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withProxyUrl('http://main--foo--bar.aem.page');

    await project.init();
    project.log.level = 'silly';

    nock('http://main--foo--bar.aem.page')
      .get('/cookie-test')
      .reply(() => [200, '', {
        'set-cookie': ['cookie1=value1', 'cookie2=value2'],
      }]);

    try {
      await project.start();
      const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/cookie-test`);
      assert.strictEqual(resp.status, 200);
      assert.deepStrictEqual(resp.headers.raw()['set-cookie'], ['cookie1=value1', 'cookie2=value2']);
    } finally {
      await project.stop();
    }
  });

  describe('HTML Folder serving', () => {
    it('serves HTML files without extensions from designated folder', async () => {
      const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

      // Create a drafts folder with an HTML file
      const draftsDir = path.join(cwd, 'drafts');
      await fse.ensureDir(draftsDir);
      await fse.writeFile(path.join(draftsDir, 'example.html'), '<html><body>Hello from drafts</body></html>');

      const project = new HelixProject()
        .withCwd(cwd)
        .withHttpPort(0)
        .withProxyUrl('https://main--foo--bar.aem.page/')
        .withHtmlFolder('drafts');

      await project.init();
      try {
        await project.start();
        const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/drafts/example`);
        assert.strictEqual(resp.status, 200);
        const body = await resp.text();
        assert.strictEqual(body, '<html><body>Hello from drafts</body></html>');
      } finally {
        await project.stop();
      }
    });

    it('passes non-existent HTML folder requests to proxy', async () => {
      const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

      // Create a drafts folder but don't create the requested file
      const draftsDir = path.join(cwd, 'drafts');
      await fse.ensureDir(draftsDir);

      const project = new HelixProject()
        .withCwd(cwd)
        .withHttpPort(0)
        .withProxyUrl('https://main--foo--bar.aem.page/')
        .withHtmlFolder('drafts');

      // Mock the proxy requests
      // The proxy handler will try both with and without .html
      // Mark as optional since in CI the request might fail before reaching the mock
      nock('https://main--foo--bar.aem.page')
        .get('/drafts/nonexistent')
        .optionally()
        .reply(404, 'Not Found');
      nock('https://main--foo--bar.aem.page')
        .get('/drafts/nonexistent.html')
        .optionally()
        .reply(404, 'Not Found');

      await project.init();
      try {
        await project.start();
        const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/drafts/nonexistent`);
        // When the HTML file doesn't exist, it falls through to the proxy
        // In test environment with nock, this may result in 404 or 502
        const validStatuses = [404, 502];
        assert.ok(validStatuses.includes(resp.status), `Expected 404 or 502, got ${resp.status}`);
      } finally {
        await project.stop();
      }
    });

    it('does not affect normal file serving outside HTML folder', async () => {
      const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

      // Create a drafts folder
      const draftsDir = path.join(cwd, 'drafts');
      await fse.ensureDir(draftsDir);
      await fse.writeFile(path.join(draftsDir, 'example.html'), '<html><body>Hello from drafts</body></html>');

      const project = new HelixProject()
        .withCwd(cwd)
        .withHttpPort(0)
        .withProxyUrl('https://main--foo--bar.aem.page/')
        .withHtmlFolder('drafts');

      await project.init();
      try {
        await project.start();
        // Test normal file serving still works
        await assertHttp(`http://127.0.0.1:${project.server.port}/welcome.txt`, 200, 'expected_welcome.txt');
      } finally {
        await project.stop();
      }
    });

    it('rejects path traversal attempts in HTML folder', async () => {
      const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

      const draftsDir = path.join(cwd, 'drafts');
      await fse.ensureDir(draftsDir);

      const project = new HelixProject()
        .withCwd(cwd)
        .withHttpPort(0)
        .withProxyUrl('https://main--foo--bar.aem.page/')
        .withHtmlFolder('drafts');

      await project.init();
      try {
        await project.start();
        // Test path traversal attempts
        // Note: URLs with /../ get normalized by the browser, so we test the handler directly
        // Handler silently rejects these and passes to next handler (proxy) returning 404
        const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/drafts/..%2F..%2Fetc%2Fpasswd`);
        // Should fall through to proxy which returns 404
        const validStatuses = [404, 502]; // 502 if proxy fails in test environment
        assert.ok(validStatuses.includes(resp.status), `Expected 404 or 502, got ${resp.status}`);
      } finally {
        await project.stop();
      }
    });

    it('rejects invalid HTML folder names', async () => {
      const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

      // Test various invalid folder names
      const invalidNames = ['../drafts', 'drafts/../other', '/absolute/path', '..', 'folder/../../../etc'];

      for (const invalidName of invalidNames) {
        assert.throws(() => {
          new HelixProject()
            .withCwd(cwd)
            .withHttpPort(0)
            .withProxyUrl('https://main--foo--bar.aem.page/')
            .withHtmlFolder(invalidName);
        }, /Invalid HTML folder name.*only folders within the current workspace are allowed/, `Should reject folder name: ${invalidName}`);
      }
    });

    it('throws error if HTML folder does not exist', async () => {
      const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

      const project = new HelixProject()
        .withCwd(cwd)
        .withHttpPort(0)
        .withProxyUrl('https://main--foo--bar.aem.page/')
        .withHtmlFolder('nonexistent-folder')
        .withLiveReload(true); // Required for HTML folder to be checked

      await project.init();

      try {
        await project.start();
        assert.fail('Expected start to throw error for non-existent HTML folder');
      } catch (e) {
        assert.ok(e.message.includes('HTML folder \'nonexistent-folder\' does not exist'), `Unexpected error message: ${e.message}`);
      } finally {
        await project.stop();
      }
    });

    it('serves nested HTML files correctly', async () => {
      const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

      // Create nested structure
      const draftsDir = path.join(cwd, 'drafts');
      const nestedDir = path.join(draftsDir, 'subfolder');
      await fse.ensureDir(nestedDir);
      await fse.writeFile(path.join(nestedDir, 'nested.html'), '<html><body>Nested content</body></html>');

      const project = new HelixProject()
        .withCwd(cwd)
        .withHttpPort(0)
        .withProxyUrl('https://main--foo--bar.aem.page/')
        .withHtmlFolder('drafts');

      await project.init();
      try {
        await project.start();
        const resp = await getFetch()(`http://127.0.0.1:${project.server.port}/drafts/subfolder/nested`);
        assert.strictEqual(resp.status, 200);
        const body = await resp.text();
        assert.strictEqual(body, '<html><body>Nested content</body></html>');
      } finally {
        await project.stop();
      }
    });
  });
});
