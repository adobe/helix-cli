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
const assert = require('assert');
const Replay = require('replay');
const index = require('../src/openwhisk/static');

Replay.mode = 'replay';
Replay.fixtures = `${__dirname}/fixtures/`;

/* eslint-env mocha */
describe('Static Delivert Action #integrationtest', () => {
  it('deliver CSS file', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: 'master',
      entry: '/dist/style.css',
      plain: true
    });

    assert.equal(res.headers['Content-Type'], 'text/css');
    assert.equal(res.headers['X-Static'], 'Raw/Static');
    assert.equal(res.headers['Cache-Control'], 's-max-age=300');
    assert.equal(res.headers['ETag'], `"xSOcRd5oxR4XWFrm4Zmxew=="`);
  });

  it('deliver PNG file', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: 'master',
      entry: 'helix_logo.png',
      plain: true
    });

    assert.equal(res.headers['Content-Type'], 'image/png');
    assert.equal(res.headers['X-Static'], 'Raw/Static');
    assert.equal(res.headers['Cache-Control'], 's-max-age=300');
    assert.equal(res.headers['ETag'], `"xrbxvVvPT1FHg5zrVHcZ7g=="`);
  });

  it('deliver JSON file', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: 'master',
      entry: 'htdocs/test.json',
      plain: true
    });

    assert.equal(res.headers['Content-Type'], 'application/json');
    assert.equal(res.headers['X-Static'], 'Raw/Static');
    assert.equal(res.headers['Cache-Control'], 's-max-age=300');
    assert.equal(res.headers['ETag'], `"oJWmHG4De8PUYQZFhlujXg=="`);
  });

  it('deliver missing file', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: 'master',
      entry: 'not-here.png',
      plain: true
    });

    assert.equal(res.statusCode, 404);
  });

  it('deliver invalid file', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: 'master',
      entry: '',
      plain: true
    });

    assert.equal(res.statusCode, 404);
  });


  it('deliver big JPEG file', async () => {
    const res = await index.main({
      owner: 'trieloff',
      repo: 'helix-demo',
      ref: 'master',
      entry: 'big-image.jpg',
      plain: true
    });

    assert.equal(res.statusCode, 307);
    assert.equal(res.headers.Location, 'https://raw.githubusercontent.com/trieloff/helix-demo/master/big-image.jpg')
    assert.equal(res.headers['X-Content-Type'], 'image/jpeg');
    assert.equal(res.headers['X-Static'], 'Raw/Static');
  }).timeout(5000);
});

describe('Static Delivery Action #unittest', () => {
  it('error() #unittest', () => {
    const error = index.error('Test');
    assert.equal(error.statusCode, '500');
    assert.ok(error.body.match('500'));
    assert.ok(!error.body.match('404'));
  });

  it('addHeaders() #unittest', () => {
    const before = {};
    const afterMaster = index.addHeaders(before, 'master', 'foobar');
    assert.ok(afterMaster.ETag.match(/^".*"$/));

    const afterSha = index.addHeaders(before, 'bcdcc24e8ebc25a07a35d05afd85551a83fa5af3', 'foobar');
    assert.ok(afterSha['Cache-Control'].match(/^max-age/));
  });

  it('isBinary() #unittest', () => {
    assert.equal(index.isBinary('application/octet-stream'), true);
    assert.equal(index.isBinary('image/png'), true);
    assert.equal(index.isBinary('un/known'), true);
    assert.equal(index.isBinary('image/svg+xml'), true);

    assert.equal(index.isBinary('text/html'), false);
    assert.equal(index.isBinary('text/xml'), false);
    assert.equal(index.isBinary('application/json'), false);
    assert.equal(index.isBinary('application/javascript'), false);
  });

  it('staticBase() #unittest', () => {
    assert.ok(index.staticBase('foo', 'bar', 'index.html', 'index.css', 'master').match(/__HLX.*DIST__/));
  });

  it('blacklisted() #unittest', () => {
    assert.equal(index.blacklisted('index.html'), false);
    assert.equal(index.blacklisted('/index.html'), false);
    assert.equal(index.blacklisted('/robots.txt'), false);
    assert.equal(index.blacklisted('robots.txt'), false);
    assert.equal(index.blacklisted('hello.css'), false);
    assert.equal(index.blacklisted('/style/hello.css'), false);
    assert.equal(index.blacklisted('foo/html.htl'), false);

    assert.equal(index.blacklisted('package.json'), true);
    assert.equal(index.blacklisted('/package.json'), true);
    assert.equal(index.blacklisted('helix-config.yaml'), true);
    assert.equal(index.blacklisted('/helix-config.yaml'), true);
    assert.equal(index.blacklisted('.circleci/config.yml'), true);
    assert.equal(index.blacklisted('/.circleci/config.yml'), true);
    assert.equal(index.blacklisted('/src/html.htl'), true);
    assert.equal(index.blacklisted('src/html.htl'), true);

    assert.equal(index.blacklisted('foo/html.htl', '^.*\\.htl$|^.*\\.js$'), false);
    assert.equal(index.blacklisted('foo/html.js', '^.*\\.htl$|^.*\\.js$'), false);
    assert.equal(index.blacklisted('foo/html.jst', '^.*\\.htl$|^.*\\.js$'), true);
    assert.equal(index.blacklisted('src/html.htl', '^.*\\.htl$|^.*\\.js$'), true);

    assert.equal(index.blacklisted('foo/html.htl', '^.*\\.htl$|^.*\\.js$', 'foo'), true);
    assert.equal(index.blacklisted('boo/html.htl', '^.*\\.htl$|^.*\\.js$', 'foo'), false);
    assert.equal(index.blacklisted('src/html.htl', '^.*\\.htl$|^.*\\.js$', 'foo'), true);

    assert.equal(index.blacklisted('foo/html.htl', '^.*\\.htl$|^.*\\.js$', ''), false);
  });

  it('main() returns static file from GitHub', async () => {
    const res = await index.main({
      owner: 'adobe',
      repo: 'helix-cli',
      entry: '/demos/simple/htdocs/style.css',
      plain: true,
    });
    assert.ok(res.body.indexOf('Arial') > 0, true);
  });

  it('main() returns 403 if plain is false', async () => {
    const res = await index.main({
      owner: 'adobe',
      repo: 'helix-cli',
      entry: '/demos/simple/htdocs/style.css',
      plain: false,
    });
    assert.equal(res.statusCode, 403);
  });

  it('main() returns 403 in case of backlisted file', async () => {
    const res = await index.main({
      owner: 'adobe',
      repo: 'helix-cli',
      entry: '/package.json',
      plain: true,
    });
    assert.equal(res.statusCode, 403);
  });
});
