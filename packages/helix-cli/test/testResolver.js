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

/* global describe, it */

const assert = require('assert');
const resolver = require('../src/parcel/resolver.js');

describe('Test plain extension resolution', () => {
  it('html.htl extension', () => {
    assert.equal('html', resolver.extension('html.htl'));
  });

  it('js.htl extension', () => {
    assert.equal('js', resolver.extension('js.htl'));
  });

  it('json.htl extension', () => {
    assert.equal('json', resolver.extension('json.htl'));
  });
});

describe('Test complex extension resolution', () => {
  it('foo_html.htl extension', () => {
    assert.equal('html', resolver.extension('foo_html.htl'));
  });

  it('js.foo_html.htl extension', () => {
    assert.equal('html', resolver.extension('js.foo_html.htl'));
  });

  it('bar_js.htl extension', () => {
    assert.equal('js', resolver.extension('bar_js.htl'));
  });

  it('not.html.bar_js.htl extension', () => {
    assert.equal('js', resolver.extension('not.html.bar_js.htl'));
  });

  it('some.thing.baz_json.htl extension', () => {
    assert.equal('json', resolver.extension('some.thing.baz_json.htl'));
  });
});

describe('Test special character extension resolution', () => {
  it('🎅🏼_html.htl extension', () => {
    assert.equal('html', resolver.extension('🎅🏼_html.htl'));
  });

  it('...foo_html.htl extension', () => {
    assert.equal('html', resolver.extension('...foo_html.htl'));
  });

  it('=_js.htl extension', () => {
    assert.equal('js', resolver.extension('=_js.htl'));
  });

  it('%20.html.bar_js.htl extension', () => {
    assert.equal('js', resolver.extension('%20.html.bar_js.htl'));
  });

  it('some.".baz_json.htl extension', () => {
    assert.equal('json', resolver.extension('some.".baz_json.htl'));
  });
});

describe('Test simple selector resolution', () => {
  it('foo_html.htl selector', () => {
    assert.equal('foo', resolver.selector('foo_html.htl'));
  });

  it('js.foo_html.htl selector', () => {
    assert.equal('js.foo', resolver.selector('js.foo_html.htl'));
  });

  it('bar_js.htl selector', () => {
    assert.equal('bar', resolver.selector('bar_js.htl'));
  });

  it('not.html.bar_js.htl selector', () => {
    assert.equal('not.html.bar', resolver.selector('not.html.bar_js.htl'));
  });

  it('some.thing.baz_json.htl selector', () => {
    assert.equal('some.thing.baz', resolver.selector('some.thing.baz_json.htl'));
  });
});

describe('Test null selector resolution', () => {
  it('html.htl extension', () => {
    assert.equal(null, resolver.selector('html.htl'));
  });

  it('js.htl extension', () => {
    assert.equal(null, resolver.selector('js.htl'));
  });

  it('json.htl extension', () => {
    assert.equal(null, resolver.selector('json.htl'));
  });
});
