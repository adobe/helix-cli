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

const assert = require('assert');
const AdapterJSAsset = require('../src/parcel/AdapterJSAsset');

describe('#unit test AdapterJSAsset', () => {
  it('AdapterJSAsset finds the correct assets', () => {
    [
      'html.js',
      'api_json.js',
      'footer_html.jsx',
    ].forEach((name) => {
      assert.ok(AdapterJSAsset.isPureScript(name), `${name} should be a pure script`);
    });
  });

  it('AdapterJSAsset rejects incorrect assets', () => {
    [
      'html.boo',
      'svg.jsy',
      'unknown.js',
      'html_invalid.jsx',
    ].forEach((name) => {
      assert.ok(AdapterJSAsset.isPureScript(name), `${name} should not be a pure script`);
    });
  });
});
