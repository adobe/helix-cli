/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* eslint-disable no-param-reassign */
/* eslint-env mocha */
import assert from 'assert';
import os from 'os';
import fse from 'fs-extra';
import path from 'path';
import HeadHtmlSupport from '../src/server/HeadHtmlSupport.js';
import { Nock, createTestRoot, setupProject } from './utils.js';

function removePosition(tree) {
  // eslint-disable-next-line no-param-reassign
  delete tree.position;
  for (const child of tree.children ?? []) {
    removePosition(child);
  }
  return tree;
}

async function init(hhs, localHtml, remoteHtml) {
  hhs.localHtml = localHtml;
  hhs.remoteHtml = remoteHtml;
  if (remoteHtml) {
    hhs.remoteDom = await HeadHtmlSupport.toDom(hhs.remoteHtml);
    HeadHtmlSupport.hash(hhs.remoteDom);
  }
}

const DEFAULT_OPTS = (opts = {}) => ({
  log: console,
  directory: '.',
  proxyUrl: 'https://main--helix-website--adobe.hlx.page/',
  ...opts,
});

describe('Head.html replacement tests', () => {
  it('replaces the head html within <head> tags', async () => {
    const hhs = new HeadHtmlSupport(DEFAULT_OPTS());
    hhs.isModified = true;
    const source = `
<html>
<head>
  <title></title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <script src="/scripts/my-main-script.js" type="module" crossorigin="use-credentials" defer></script>
  <link rel="stylesheet" href="/styles/my-main-styles.css"/>
  <link rel="icon" href="data:,">   
</head>
</html>
    `;
    const remote = `
      <script src="/scripts/my-main-script.js" type="module" crossorigin="use-credentials" defer></script>
      <link rel="stylesheet" href="/styles/my-main-styles.css"/>
    `;
    const expected = `
<html>
<head>
  <title></title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <!-- replaced -->
  <link rel="icon" href="data:,">   
</head>
</html>
    `;
    await init(hhs, '<!-- replaced -->', remote);
    assert.strictEqual(await hhs.replace(source), expected);
  });

  it('replaces the empty head html at the end', async () => {
    const hhs = new HeadHtmlSupport(DEFAULT_OPTS());
    hhs.isModified = true;
    await init(hhs, '<title>local</title>', '');

    hhs.localHtml = 'local html';
    hhs.remoteHtml = '';
    assert.strictEqual(await hhs.replace('<html><head><title>some other stuff</title></head></html>'), '<html><head><title>some other stuff</title>local html</head></html>');
  });

  it('replaces the head html with empty string', async () => {
    const hhs = new HeadHtmlSupport(DEFAULT_OPTS());
    hhs.isModified = true;
    await init(hhs, '', '<title>remote</title>');
    assert.strictEqual(await hhs.replace('<html><head><title>remote</title></head></html>'), '<html><head></head></html>');
  });

  it('doesnt replace html if no <head> tag', async () => {
    const hhs = new HeadHtmlSupport(DEFAULT_OPTS());
    hhs.isModified = true;
    await init(hhs, '<title>local</title>', '<title>remote</title>');
    const source = '<html><a>remote</a></html>';
    assert.strictEqual(await hhs.replace(source), source);
  });

  it('doesnt replace html if not modified', async () => {
    const hhs = new HeadHtmlSupport(DEFAULT_OPTS());
    hhs.isModified = false;
    const source = '<html><a>remote</a></html>';
    assert.strictEqual(await hhs.replace(source), source);
  });
});

describe('Head.html loading tests', () => {
  let testRoot;
  let nock;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    nock = new Nock();
    nock.enableNetConnect(/localhost/);
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

  it('loads local head.html', async () => {
    const directory = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const hhs = new HeadHtmlSupport(DEFAULT_OPTS({ directory }));
    await hhs.loadLocal();
    assert.strictEqual(hhs.localHtml, '<!-- local head html -->\n<link rel="stylesheet" href="/styles.css"/>');
    assert.strictEqual(hhs.localStatus, 200);
  });

  it('loads missing head.html', async () => {
    const directory = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const hhs = new HeadHtmlSupport(DEFAULT_OPTS({ directory: `${directory}-not-exist` }));
    await hhs.loadLocal();
    assert.strictEqual(hhs.localHtml, '');
    assert.strictEqual(hhs.localStatus, 404);
  });

  it('loads remote head.html', async () => {
    const directory = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const scope = nock('https://main--blog--adobe.hlx.page')
      .get('/head.html')
      .reply(200, '<!-- remote head html -->   <script>a=1;</script>');

    const hhs = new HeadHtmlSupport({
      log: console,
      proxyUrl: 'https://main--blog--adobe.hlx.page',
      directory,
    });
    await hhs.loadRemote();
    assert.deepStrictEqual(removePosition(hhs.remoteDom), {
      children: [{
        hash: 'aFbT/8fYKjoJO+mDUBdmWFkAFak=',
        type: 'comment',
        value: ' remote head html ',
      }, {
        children: [{
          hash: 'Jud10pu0mYou3/uv0K6z0Xh65ro=',
          type: 'text',
          value: 'a=1;',
        }],
        hash: '9DxlQTxDyYbwYR7d00QHfbdG0CM=',
        properties: {},
        tagName: 'script',
        type: 'element',
      }],
      data: { quirksMode: false },
      hash: '3SCZf2Q6w9ulAIi6zOjYEhggRZQ=',
      type: 'root',
    });
    assert.strictEqual(hhs.remoteStatus, 200);
    scope.done();
  });

  it('loads missing remote head.html', async () => {
    const directory = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const scope = nock('https://main--blog--adobe.hlx.page')
      .get('/head.html')
      .reply(404);

    const hhs = new HeadHtmlSupport({
      log: console,
      proxyUrl: 'https://main--blog--adobe.hlx.page',
      directory,
    });
    await hhs.loadRemote();
    assert.strictEqual(hhs.remoteDom, null);
    assert.strictEqual(hhs.remoteStatus, 404);
    scope.done();
  });

  it('init loads local and remote head.html', async () => {
    const directory = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    nock('https://main--blog--adobe.hlx.page')
      .get('/head.html')
      .reply(200, '<!-- remote head html --><a>fooo</a>\n');

    const hhs = new HeadHtmlSupport({
      log: console,
      proxyUrl: 'https://main--blog--adobe.hlx.page',
      directory,
    });
    await hhs.init();
    assert.strictEqual(hhs.remoteHtml, '<!-- remote head html --><a>fooo</a>');
    assert.strictEqual(hhs.remoteStatus, 200);
    assert.strictEqual(hhs.localHtml, '<!-- local head html -->\n<link rel="stylesheet" href="/styles.css"/>');
    assert.strictEqual(hhs.localStatus, 200);
    assert.strictEqual(hhs.isModified, true);

    await hhs.init(); // only once
  });

  it('init loads local and remote head.html (not modified)', async () => {
    const directory = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const scope = nock('https://main--blog--adobe.hlx.page')
      .get('/head.html')
      .reply(200, '<!-- local head html -->\n<link rel="stylesheet" href="/styles.css"/>');

    const hhs = new HeadHtmlSupport({
      log: console,
      proxyUrl: 'https://main--blog--adobe.hlx.page',
      directory,
    });
    await hhs.init();
    assert.strictEqual(hhs.remoteHtml, '<!-- local head html -->\n<link rel="stylesheet" href="/styles.css"/>');
    assert.strictEqual(hhs.remoteStatus, 200);
    assert.strictEqual(hhs.localHtml, '<!-- local head html -->\n<link rel="stylesheet" href="/styles.css"/>');
    assert.strictEqual(hhs.localStatus, 200);
    assert.strictEqual(hhs.isModified, false);

    await hhs.init(); // only once
    scope.done();
  });

  it('init sets modified to false if local status failed', async () => {
    const hhs = new HeadHtmlSupport(DEFAULT_OPTS());
    hhs.localHtml = '';
    hhs.remoteHtml = '';
    hhs.localStatus = 404;
    hhs.remoteStatus = 200;
    await hhs.init();
    assert.strictEqual(hhs.isModified, false);
  });

  it('init sets modified to false if remote status failed', async () => {
    const hhs = new HeadHtmlSupport(DEFAULT_OPTS());
    hhs.localHtml = '';
    hhs.remoteHtml = '';
    hhs.localStatus = 200;
    hhs.remoteStatus = 404;
    await hhs.init();
    assert.strictEqual(hhs.isModified, false);
  });
});
