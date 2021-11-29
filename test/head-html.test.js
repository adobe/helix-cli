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

/* eslint-env mocha */
import assert from 'assert';
import nock from 'nock';
import os from 'os';
import fse from 'fs-extra';
import path from 'path';
import HeadHtmlSupport from '../src/server/HeadHtmlSupport.js';
import { createTestRoot, setupProject } from './utils.js';

describe('Head.html replacement tests', () => {
  it('replaces the head html within <head> tags', () => {
    const hhs = new HeadHtmlSupport({ log: console, directory: '.' });
    hhs.isModified = true;
    hhs.localHtml = 'local html';
    hhs.remoteHtml = 'remote html';
    assert.strictEqual(hhs.replace('<html><head>->remote html<-</head></html>'), '<html><head>->local html<-</head></html>');
  });

  it('replaces the empty head html at the end', () => {
    const hhs = new HeadHtmlSupport({ log: console, directory: '.' });
    hhs.isModified = true;
    hhs.localHtml = 'local html';
    hhs.remoteHtml = '';
    assert.strictEqual(hhs.replace('<html><head>some other stuff</head></html>'), '<html><head>some other stufflocal html</head></html>');
  });

  it('replaces the head html with empty string', () => {
    const hhs = new HeadHtmlSupport({ log: console, directory: '.' });
    hhs.isModified = true;
    hhs.localHtml = '';
    hhs.remoteHtml = '->remote html<-';
    assert.strictEqual(hhs.replace('<html><head>some ->remote html<- stuff</head></html>'), '<html><head>some  stuff</head></html>');
  });

  it('doesnt replace html before <head> tags', () => {
    const hhs = new HeadHtmlSupport({ log: console, directory: '.' });
    hhs.isModified = true;
    hhs.localHtml = 'local html';
    hhs.remoteHtml = 'remote html';
    const source = '<html>->remote html<-<head>foo</head></html>';
    assert.strictEqual(hhs.replace(source), source);
  });

  it('doesnt replace html after <head> tags', () => {
    const hhs = new HeadHtmlSupport({ log: console, directory: '.' });
    hhs.isModified = true;
    hhs.localHtml = 'local html';
    hhs.remoteHtml = 'remote html';
    const source = '<html><head>foo</head>->remote html<-</html>';
    assert.strictEqual(hhs.replace(source), source);
  });

  it('doesnt replace html if no start <head> tags', () => {
    const hhs = new HeadHtmlSupport({ log: console, directory: '.' });
    hhs.isModified = true;
    hhs.localHtml = 'local html';
    hhs.remoteHtml = 'remote html';
    const source = '<html>->remote html<- foo</head></html>';
    assert.strictEqual(hhs.replace(source), source);
  });

  it('doesnt replace html if no end <head> tags', () => {
    const hhs = new HeadHtmlSupport({ log: console, directory: '.' });
    hhs.isModified = true;
    hhs.localHtml = 'local html';
    hhs.remoteHtml = 'remote html';
    const source = '<html><head>foo ->remote html<- </html>';
    assert.strictEqual(hhs.replace(source), source);
  });
});

describe('Head.html loading tests', () => {
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

  it('loads local head.html', async () => {
    const directory = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const hhs = new HeadHtmlSupport({ log: console, directory });
    await hhs.loadLocal();
    assert.strictEqual(hhs.localHtml, '<!-- local head html -->\n<link rel="stylesheet" href="/styles.css">');
    assert.strictEqual(hhs.localStatus, 200);
  });

  it('loads missing head.html', async () => {
    const directory = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const hhs = new HeadHtmlSupport({ log: console, directory: `${directory}-not-exist` });
    await hhs.loadLocal();
    assert.strictEqual(hhs.localHtml, '');
    assert.strictEqual(hhs.localStatus, 404);
  });

  it('loads remote head.html', async () => {
    const directory = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const scope = nock('https://main--blog--adobe.hlx3.page')
      .get('/head.html')
      .reply(200, '<!-- remote head html -->');

    const hhs = new HeadHtmlSupport({
      log: console,
      proxyUrl: 'https://main--blog--adobe.hlx3.page',
      directory,
    });
    await hhs.loadRemote();
    assert.strictEqual(hhs.remoteHtml, '<!-- remote head html -->');
    assert.strictEqual(hhs.remoteStatus, 200);
    scope.done();
  });

  it('loads missing remote head.html', async () => {
    const directory = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const scope = nock('https://main--blog--adobe.hlx3.page')
      .get('/head.html')
      .reply(404);

    const hhs = new HeadHtmlSupport({
      log: console,
      proxyUrl: 'https://main--blog--adobe.hlx3.page',
      directory,
    });
    await hhs.loadRemote();
    assert.strictEqual(hhs.remoteHtml, '');
    assert.strictEqual(hhs.remoteStatus, 404);
    scope.done();
  });

  it('init loads local and remote head.html', async () => {
    const directory = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const scope = nock('https://main--blog--adobe.hlx3.page')
      .get('/head.html')
      .reply(200, '<!-- remote head html -->');

    const hhs = new HeadHtmlSupport({
      log: console,
      proxyUrl: 'https://main--blog--adobe.hlx3.page',
      directory,
    });
    await hhs.init();
    assert.strictEqual(hhs.remoteHtml, '<!-- remote head html -->');
    assert.strictEqual(hhs.remoteStatus, 200);
    assert.strictEqual(hhs.localHtml, '<!-- local head html -->\n<link rel="stylesheet" href="/styles.css">');
    assert.strictEqual(hhs.localStatus, 200);
    assert.strictEqual(hhs.isModified, true);

    await hhs.init(); // only once
    scope.done();
  });

  it('init loads local and remote head.html (not modified)', async () => {
    const directory = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const scope = nock('https://main--blog--adobe.hlx3.page')
      .get('/head.html')
      .reply(200, '<!-- local head html -->\n<link rel="stylesheet" href="/styles.css"/>');

    const hhs = new HeadHtmlSupport({
      log: console,
      proxyUrl: 'https://main--blog--adobe.hlx3.page',
      directory,
    });
    await hhs.init();
    assert.strictEqual(hhs.remoteHtml, '<!-- local head html -->\n<link rel="stylesheet" href="/styles.css">');
    assert.strictEqual(hhs.remoteStatus, 200);
    assert.strictEqual(hhs.localHtml, '<!-- local head html -->\n<link rel="stylesheet" href="/styles.css">');
    assert.strictEqual(hhs.localStatus, 200);
    assert.strictEqual(hhs.isModified, false);

    await hhs.init(); // only once
    scope.done();
  });

  it('init sets modified to false if local status failed', async () => {
    const hhs = new HeadHtmlSupport({ log: console, directory: '.' });
    hhs.localHtml = '';
    hhs.remoteHtml = '';
    hhs.localStatus = 404;
    hhs.remoteStatus = 200;
    await hhs.init();
    assert.strictEqual(hhs.isModified, false);
  });

  it('init sets modified to false if remote status failed', async () => {
    const hhs = new HeadHtmlSupport({ log: console, directory: '.' });
    hhs.localHtml = '';
    hhs.remoteHtml = '';
    hhs.localStatus = 200;
    hhs.remoteStatus = 404;
    await hhs.init();
    assert.strictEqual(hhs.isModified, false);
  });
});
