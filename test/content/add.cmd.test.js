/*
 * Copyright 2026 Adobe. All rights reserved.
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
import { normalizePathForContentAdd } from '../../src/content/add.cmd.js';

describe('normalizePathForContentAdd', () => {
  it('strips content/ prefix', () => {
    assert.strictEqual(normalizePathForContentAdd('content/index.html'), 'index.html');
    assert.strictEqual(normalizePathForContentAdd('content/blog/post.html'), 'blog/post.html');
  });

  it('strips ./content/ prefix', () => {
    assert.strictEqual(normalizePathForContentAdd('./content/foo.html'), 'foo.html');
  });

  it('maps content or content/ to .', () => {
    assert.strictEqual(normalizePathForContentAdd('content'), '.');
    assert.strictEqual(normalizePathForContentAdd('content/'), '.');
  });

  it('normalizes backslashes before stripping prefix', () => {
    assert.strictEqual(normalizePathForContentAdd('content\\dir\\a.txt'), 'dir/a.txt');
  });

  it('leaves repo-relative paths unchanged', () => {
    assert.strictEqual(normalizePathForContentAdd('index.html'), 'index.html');
    assert.strictEqual(normalizePathForContentAdd('.'), '.');
  });
});
