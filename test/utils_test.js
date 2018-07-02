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
const RequestContext = require('../src/RequestContext.js');

describe('Utils Test', () => {
  describe('Request context', () => {
    const TESTS = [
      {
        url: '/', valid: true, path: '/', resourcePath: '/index',
      },
      {
        url: '/content', valid: true, path: '/content', resourcePath: '/content',
      },
      {
        url: '/content/index.html', valid: true, path: '/content/index.html', resourcePath: '/content/index',
      },
    ];

    TESTS.forEach((t) => {
      it(`parses ${t.url} correctly`, () => {
        const mockReq = {
          url: t.url,
        };
        const p = new RequestContext(mockReq);
        assert.equal(p.valid, t.valid, 'valid');
        if (p.valid) {
          assert.equal(p.path, t.path, 'path');
          assert.equal(p.resourcePath, t.resourcePath, 'resourcePath');
        }
      });
    });
  });
});
