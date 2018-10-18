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
const index = require('../src/openwhisk/static');
/* eslint-env mocha */

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

    assert.equal(index.isBinary('text/html'), false);
    assert.equal(index.isBinary('application/json'), false);
    assert.equal(index.isBinary('application/javascript'), false);
    assert.equal(index.isBinary('image/svg+xml'), false);
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
});
