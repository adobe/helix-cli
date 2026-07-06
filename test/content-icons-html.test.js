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
import { transformContentIconsHtml } from '../src/content/content-icons-html.js';

describe('content-icons-html', () => {
  it('rewrites :icon-name: text into an icon span', () => {
    const input = '<body><p>Hello :smile: world</p></body>';
    const output = transformContentIconsHtml(input);
    assert.ok(output.includes('<span class="icon icon-smile"></span>'));
    assert.ok(!output.includes(':smile:'));
  });

  it('rewrites multiple icons in the same text node', () => {
    const input = '<body><p>:one: and :two:</p></body>';
    const output = transformContentIconsHtml(input);
    assert.ok(output.includes('icon-one'));
    assert.ok(output.includes('icon-two'));
  });

  it('leaves text without icon syntax unchanged', () => {
    const input = '<body><p>Hello world</p></body>';
    const output = transformContentIconsHtml(input);
    assert.strictEqual(output, input);
  });

  it('does not rewrite icon syntax inside code blocks', () => {
    const input = '<body><code>:smile:</code></body>';
    const output = transformContentIconsHtml(input);
    assert.ok(output.includes(':smile:'));
  });

  it('does not rewrite timestamps that look like icon syntax', () => {
    const input = '<body><p>10:30:00</p></body>';
    const output = transformContentIconsHtml(input);
    assert.strictEqual(output, input);
  });
});
