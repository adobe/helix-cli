/*
 * Copyright 2019 Adobe. All rights reserved.
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
import { context as fetchContext } from '@adobe/fetch';
import { Nock, assertHttp, createTestRoot } from './utils.js';
import ImportCommand from '../src/import.cmd.js';

const { fetch } = fetchContext({ rejectUnauthorized: false });

const TEST_DIR = path.resolve(__rootdir, 'test', 'fixtures', 'import');
const SAMPLE_HOST = 'http://www.sample.com';

describe('Integration test for import command', function suite() {
  let nock;

  beforeEach(async () => {
    nock = new Nock();
    nock.enableNetConnect(/127.0.0.1/);
  });

  afterEach(() => {
    nock.done();
  });

  this.timeout(60000);

  it('import command delivers correct response without cache', (done) => {
    let error = null;
    const cmd = new ImportCommand()
      .withDirectory(TEST_DIR)
      .withOpen('false')
      .withKill(false)
      .withSkipUI(true)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    const content = {
      index: 'Hello world',
      img: '<svg/>',
    };

    nock(SAMPLE_HOST)
      .get('/index.html')
      .reply(200, content.index)
      .get('/index.html')
      .reply(200, content.index)
      .get('/logo.svg')
      .reply(200, content.img, { 'Content-Type': 'image/svg+xml' })
      .get('/not-found.txt')
      .reply(404)
      .get('/redirect.html')
      .reply(301, '', { Location: '/index.html' })
      .get('/redirect-with-host.html')
      .reply(301, '', { Location: `${SAMPLE_HOST}/index.html` })
      .get('/redirect-with-external-host.html')
      .reply(301, '', { Location: 'https://www.somewhereelse.com' })
      .get('/index-with-cookie.html')
      .reply(200, content.index, { 'set-cookie': 'JSESSIONID=07A8BAAC4D936AEA864387BE61A4C457; Path=/; Secure; HttpOnly' })
      .get('/page-with-security.html')
      .reply(200, content.index, { 'content-security-policy': 'frame-ancestors *.sample.com', 'x-frame-options': 'SAMEORIGIN' });

    cmd
      .on('started', async () => {
        try {
          // test proxy
          await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/index.html`, 403);

          let resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/index.html?host=${SAMPLE_HOST}`);
          assert.strictEqual(resp.status, 200);
          let text = await resp.text();
          assert.strictEqual(text.trim(), content.index);
          let cookies = resp.headers.get('set-cookie');
          assert.equal(cookies, `hlx-proxyhost=${encodeURIComponent(SAMPLE_HOST)}; Path=/`);

          // "host" cookie has been set and host query param is not required anymore
          resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/index.html`, {
            headers: {
              cookie: cookies,
            },
          });
          assert.strictEqual(resp.status, 200);
          text = await resp.text();
          assert.strictEqual(text.trim(), content.index);

          resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/logo.svg`, {
            headers: {
              cookie: cookies,
            },
          });
          assert.strictEqual(resp.status, 200);
          text = await resp.text();
          assert.strictEqual(text.trim(), content.img);

          resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/not-found.txt`, {
            headers: {
              cookie: cookies,
            },
          });
          assert.strictEqual(resp.status, 404);

          resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/redirect.html`, {
            redirect: 'manual',
            headers: {
              cookie: cookies,
            },
          });
          assert.strictEqual(resp.status, 301);
          assert.strictEqual(resp.headers.get('Location'), '/index.html');

          resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/redirect-with-host.html`, {
            redirect: 'manual',
            headers: {
              cookie: cookies,
            },
          });
          assert.strictEqual(resp.status, 301);
          assert.strictEqual(resp.headers.get('Location'), '/index.html');

          resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/redirect-with-external-host.html`, {
            redirect: 'manual',
            headers: {
              cookie: cookies,
            },
          });
          assert.strictEqual(resp.status, 301);
          assert.strictEqual(resp.headers.get('Location'), 'https://www.somewhereelse.com');

          resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/index-with-cookie.html`, {
            headers: {
              cookie: cookies,
            },
          });
          assert.strictEqual(resp.status, 200);
          text = await resp.text();
          assert.strictEqual(text.trim(), content.index);
          cookies = resp.headers.get('set-cookie');
          assert.equal(cookies, `hlx-proxyhost=${encodeURIComponent(SAMPLE_HOST)}; Path=/`);

          resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/page-with-security.html`, {
            redirect: 'manual',
            headers: {
              cookie: cookies,
            },
          });
          assert.strictEqual(resp.status, 200);
          assert.strictEqual(resp.headers.get('content-security-policy'), null);
          assert.strictEqual(resp.headers.get('x-frame-options'), null);

          // /tools is delivered for local project folder
          const js = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/tools/importer/import.js`, 200);
          assert.strictEqual(js.trim(), '// import.js code');

          await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/tools/not-found.txt`, 404);

          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });

  it('import command delivers correct response with update host ', (done) => {
    let error = null;
    const cmd = new ImportCommand()
      .withDirectory(TEST_DIR)
      .withOpen(false)
      .withSkipUI(true)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    const content = {
      index: `<html><head>
        <script src="${SAMPLE_HOST}/a.js"></script>
        <script src="/b.js"></script>
        <script src="./c.js"></script>
      </head>
      <body>
        <a href="${SAMPLE_HOST}">link</a>
        <a href="${SAMPLE_HOST}/">link</a>
        <a href="${SAMPLE_HOST}/absolutelink.html">link</a>
        <a href="/relativelink.html">link</a>
        <a href="./relativelink.html">link</a>
        <img src="${SAMPLE_HOST}/img/a.png">link</a>
        <img src="/img/b.png">link</a>
        <img src="./img/c.png">link</a>
      </body>`,
    };

    const expected = {
      index: `<html><head>
        <script src="/a.js"></script>
        <script src="/b.js"></script>
        <script src="./c.js"></script>
      </head>
      <body>
        <a href="/">link</a>
        <a href="/">link</a>
        <a href="/absolutelink.html">link</a>
        <a href="/relativelink.html">link</a>
        <a href="./relativelink.html">link</a>
        <img src="/img/a.png">link</a>
        <img src="/img/b.png">link</a>
        <img src="./img/c.png">link</a>
      </body>`,
    };

    nock(SAMPLE_HOST)
      .get('/index.html')
      .reply(200, content.index);

    cmd
      .on('started', async () => {
        try {
          const ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/index.html?host=${SAMPLE_HOST}`, 200);
          assert.strictEqual(ret.trim(), expected.index.trim());

          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });

  it('import command gets rid of referrer', (done) => {
    let error = null;
    const cmd = new ImportCommand()
      .withDirectory(TEST_DIR)
      .withOpen('false')
      .withKill(false)
      .withSkipUI(true)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    nock(SAMPLE_HOST, {
      badheaders: ['referer'],
    }).get('/index.html').reply(200);

    cmd
      .on('started', async () => {
        try {
          const resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/index.html?host=${SAMPLE_HOST}`, {
            headers: {
              referer: 'http://localhost',
            },
          });
          assert.strictEqual(resp.status, 200);

          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });
});

describe('Integration test for import command with cache', function suite() {
  this.timeout(60000); // ensure enough time for installing modules on slow machines
  let testDir;
  let testRoot;
  let nock;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'import');
    await fse.copy(TEST_DIR, testDir);
    nock = new Nock();
    nock.enableNetConnect(/127.0.0.1/);
  });

  afterEach(async () => {
    await fse.remove(testRoot);
    nock.done();
  });

  it('up command delivers correct cached response.', (done) => {
    let error = null;
    const cmd = new ImportCommand()
      .withDirectory(testDir)
      .withOpen(false)
      .withSkipUI(true)
      .withKill(false)
      .withHttpPort(0)
      .withCache(path.resolve(testRoot, '.cache'));

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    const content = {
      index: '## Welcome',
      page1: '## Some page with qs',
      page2: '## Some different content for different qs',
      plain: 'Some plain content',
      img: '<svg/>',
    };

    nock(SAMPLE_HOST)
      .get('/index.html')
      .reply(200, content.index)
      .get('/folder/page.html?foo=bar&baz=qux')
      .reply(200, content.page1)
      .get('/folder/page.html?foo=bar&baz=othervalue')
      .reply(200, content.page2)
      .get('/not-found.txt')
      .reply(404)
      .get('/page.plain.html')
      .reply(200, content.plain, { 'Content-Type': 'text/html' })
      .get('/logo.svg')
      .reply(200, content.img, { 'Content-Type': 'image/svg+xml' })
      .get('/redirect.html')
      .reply(301, '', { Location: '/index.html' })
      .get('/redirect-with-host.html')
      .reply(301, '', { Location: `${SAMPLE_HOST}/index.html` })
      .get('/redirect-with-external-host.html')
      .reply(301, '', { Location: 'https://www.somewhereelse.com' })
      .get('/index-with-cookie.html')
      .reply(200, content.index, { 'set-cookie': 'hlx-proxyhost=https://www.previousimport.com; Path=/; Secure; HttpOnly' })
      .get('/page-with-security.html')
      .reply(200, content.index, { 'content-security-policy': 'frame-ancestors *.sample.com', 'x-frame-options': 'SAMEORIGIN' });

    cmd
      .on('started', async () => {
        try {
          const assertRequests = async () => {
            let resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/index.html?host=${SAMPLE_HOST}`);
            assert.strictEqual(resp.status, 200);
            let ret = await resp.text();
            assert.strictEqual(ret.trim(), content.index);
            let cookies = resp.headers.get('set-cookie');
            assert.equal(cookies, `hlx-proxyhost=${encodeURIComponent(SAMPLE_HOST)}; Path=/`);

            ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/?host=${SAMPLE_HOST}`, 200);
            assert.strictEqual(ret.trim(), content.index);
            ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/folder/page.html?foo=bar&baz=qux&host=${SAMPLE_HOST}`, 200);
            assert.strictEqual(ret.trim(), content.page1);
            ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/folder/page.html?foo=bar&baz=othervalue&host=${SAMPLE_HOST}`, 200);
            assert.strictEqual(ret.trim(), content.page2);
            await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/not-found.txt?host=${SAMPLE_HOST}`, 404);
            ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/page.plain.html?host=${SAMPLE_HOST}`, 200);
            assert.strictEqual(ret.trim(), content.plain);
            ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/logo.svg?host=${SAMPLE_HOST}`, 200);
            assert.strictEqual(ret.trim(), content.img);

            resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/redirect.html?host=${SAMPLE_HOST}`, {
              redirect: 'manual',
            });
            assert.strictEqual(resp.status, 301);
            assert.strictEqual(resp.headers.get('Location'), '/index.html');

            resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/redirect-with-host.html?host=${SAMPLE_HOST}`, {
              redirect: 'manual',
            });
            assert.strictEqual(resp.status, 301);
            assert.strictEqual(resp.headers.get('Location'), '/index.html');

            resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/redirect-with-external-host.html?host=${SAMPLE_HOST}`, {
              redirect: 'manual',
            });
            assert.strictEqual(resp.status, 301);
            assert.strictEqual(resp.headers.get('Location'), 'https://www.somewhereelse.com');

            resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/index-with-cookie.html?host=${SAMPLE_HOST}`);
            assert.strictEqual(resp.status, 200);
            ret = await resp.text();
            assert.strictEqual(ret.trim(), content.index);
            cookies = resp.headers.get('set-cookie');
            assert.equal(cookies, `hlx-proxyhost=${encodeURIComponent(SAMPLE_HOST)}; Path=/`);

            resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/page-with-security.html?host=${SAMPLE_HOST}`);
            assert.strictEqual(resp.status, 200);
            assert.strictEqual(resp.headers.get('content-security-policy'), null);
            assert.strictEqual(resp.headers.get('x-frame-options'), null);

            const js = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/tools/importer/import.js`, 200);
            assert.strictEqual(js.trim(), '// import.js code');

            await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/tools/not-found.txt`, 404);
          };

          await assertRequests();

          // re-running the same requests with nock scopes "done" should still work
          // because content will be served from the cache or from local file
          await assertRequests();

          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });

  it('up command delivers POST requests.', (done) => {
    let error = null;
    const cmd = new ImportCommand()
      .withDirectory(testDir)
      .withOpen(false)
      .withSkipUI(true)
      .withKill(false)
      .withHttpPort(0)
      .withCache(path.resolve(testRoot, '.cache'));

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    nock(SAMPLE_HOST)
      .post('/some-post-url', { iteration: 1 })
      .reply(200, { postIteration: 'num-1' })
      .post('/some-post-url', { iteration: 2 })
      .reply(200, { postIteration: 'num-2' });

    cmd
      .on('started', async () => {
        try {
          let resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/some-post-url?host=${SAMPLE_HOST}`, { method: 'POST', body: '{"iteration": 1}' });
          assert.strictEqual(resp.status, 200);
          let json = await resp.json();
          assert.strictEqual(json.postIteration, 'num-1');

          resp = await fetch(`http://127.0.0.1:${cmd.project.server.port}/some-post-url?host=${SAMPLE_HOST}`, { method: 'POST', body: '{"iteration": 2}' });
          assert.strictEqual(resp.status, 200);
          json = await resp.json();
          assert.strictEqual(json.postIteration, 'num-2');

          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });
});

describe('Import command - importer ui', function suite() {
  let nock;
  let testDir;
  let testRoot;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'import');
    await fse.copy(TEST_DIR, testDir);

    nock = new Nock();
    nock.enableNetConnect(/127.0.0.1|github\.com/);
  });

  afterEach(async () => {
    nock.done();
    await fse.remove(testRoot);
  });

  this.timeout(240000);

  it('import command installs the importer ui', (done) => {
    let error = null;
    const cmd = new ImportCommand()
      .withDirectory(testDir)
      .withOpen(false)
      .withUIRepo('https://github.com/adobe/helix-importer-ui')
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    cmd
      .on('started', async () => {
        try {
          assert.ok(await fse.pathExists(`${testDir}/tools/importer/helix-importer-ui/index.html`), 'helix-importer-ui project has been cloned');
          await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/tools/importer/helix-importer-ui/index.html`, 200);

          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });
});
