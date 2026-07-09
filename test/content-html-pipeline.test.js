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
import { renderContentHtml } from '../src/content/content-html-pipeline.js';
import { buildMetadataModifiers } from '../src/server/MetadataSheetSupport.js';

describe('content-html-pipeline', () => {
  it('renders a basic content/ HTML fragment into a full HTML document', async () => {
    const input = '<body><main><div><p>Hello world</p></div></main></body>';
    const html = await renderContentHtml(input, { path: '/index.html', log: console });
    assert.ok(/^<!doctype html>/i.test(html), 'expected a full document');
    assert.ok(html.includes('<head>'));
    assert.ok(html.includes('<main>'));
    assert.ok(html.includes('Hello world'));
  });

  it('resolves canonical/og:url against the real request host when provided', async () => {
    const input = '<body><main><div><h1>Ramen</h1></div></main></body>';
    const html = await renderContentHtml(input, {
      path: '/recipe.html',
      log: console,
      headers: { host: '127.0.0.1:3000' },
    });
    assert.ok(html.includes('<meta property="og:url" content="https://127.0.0.1:3000/recipe">'));
  });

  describe('icons', () => {
    it('rewrites :icon-name: text into an icon span', async () => {
      const input = '<body><main><div><p>Hello :smile: world</p></div></main></body>';
      const html = await renderContentHtml(input, { path: '/index.html', log: console });
      assert.ok(html.includes('<span class="icon icon-smile"></span>'));
      // title/meta tags are derived before icon rewriting runs, matching production step
      // order -- only the rendered body content is expected to have the icon rewritten.
      const body = html.slice(html.indexOf('<body>'));
      assert.ok(!body.includes(':smile:'));
    });

    it('rewrites multiple icons in the same text node', async () => {
      const input = '<body><main><div><p>:one: and :two:</p></div></main></body>';
      const html = await renderContentHtml(input, { path: '/index.html', log: console });
      assert.ok(html.includes('icon-one'));
      assert.ok(html.includes('icon-two'));
    });

    it('leaves text without icon syntax unchanged', async () => {
      const input = '<body><main><div><p>Hello world</p></div></main></body>';
      const html = await renderContentHtml(input, { path: '/index.html', log: console });
      assert.ok(html.includes('Hello world'));
      assert.ok(!html.includes('class="icon'));
    });

    it('does not rewrite icon syntax inside code blocks', async () => {
      const input = '<body><main><div><p><code>:smile:</code></p></div></main></body>';
      const html = await renderContentHtml(input, { path: '/index.html', log: console });
      assert.ok(html.includes(':smile:'));
      assert.ok(!html.includes('class="icon'));
    });

    it('does not rewrite timestamps that look like icon syntax', async () => {
      const input = '<body><main><div><p>10:30:00</p></div></main></body>';
      const html = await renderContentHtml(input, { path: '/index.html', log: console });
      assert.ok(html.includes('10:30:00'));
      assert.ok(!html.includes('class="icon'));
    });
  });

  describe('page metadata', () => {
    it('removes the metadata block section and emits custom meta tags plus SEO defaults', async () => {
      // the metadata block is authored as its own section (top-level div under <main>),
      // same as any other block -- da.live convention.
      const input = '<body><main>'
        + '<div><h1>Ramen</h1></div>'
        + '<div><div class="metadata">'
        + '<div><div>Total Time</div><div>00:17:30</div></div>'
        + '<div><div>Yield</div><div>4 portions</div></div>'
        + '</div></div>'
        + '</main></body>';
      const html = await renderContentHtml(input, { path: '/recipe.html', log: console });
      assert.ok(!html.includes('class="metadata"'));
      assert.ok(!html.includes('00:17:30</div>'), 'metadata block content should not render in the body');
      assert.ok(html.includes('<meta name="total-time" content="00:17:30">'));
      assert.ok(html.includes('<meta name="yield" content="4 portions">'));
      assert.ok(html.includes('<meta property="og:title" content="Ramen">'));
      assert.ok(html.includes('<meta property="og:url"'));
      assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
    });

    it('uses an explicit Description row for description metas regardless of length', async () => {
      const input = '<body><main>'
        + '<div><h1>Ramen</h1></div>'
        + '<div><div class="metadata">'
        + '<div><div>Description</div><div>Short desc.</div></div>'
        + '</div></div>'
        + '</main></body>';
      const html = await renderContentHtml(input, { path: '/recipe.html', log: console });
      assert.ok(html.includes('<meta name="description" content="Short desc.">'));
      assert.ok(html.includes('<meta property="og:description" content="Short desc.">'));
    });

    it('derives description from a long-enough body paragraph when none is explicit', async () => {
      const input = '<body><main>'
        + '<div><h1>Ramen</h1>'
        + '<p>This is a long enough introduction paragraph to qualify as the page description.</p>'
        + '</div>'
        + '</main></body>';
      const html = await renderContentHtml(input, { path: '/recipe.html', log: console });
      assert.ok(html.includes('long enough introduction paragraph'));
    });

    it('emits only SEO defaults when there is no metadata block', async () => {
      const input = '<body><main><div><p>x</p></div></main></body>';
      const html = await renderContentHtml(input, { path: '/index.html', log: console });
      assert.ok(!html.includes('name="total-time"'));
      assert.ok(!html.includes('name="yield"'));
      assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
      assert.ok(html.includes('default-meta-image.png'));
    });
  });

  describe('sheet-based metadata overrides', () => {
    it('applies nav/footer/template from a URL-pattern-matched metadata.json row', async () => {
      const metadataModifiers = buildMetadataModifiers([
        {
          URL: '/ca/fr_ca/**', nav: '/ca/fr_ca/nav/nav', footer: '/ca/fr_ca/footer/footer', template: 'section',
        },
        { URL: '/ca/fr_ca/recipes/**', template: 'recipe' },
      ]);
      const input = '<body><main><div><h1>Ramen</h1></div></main></body>';
      const html = await renderContentHtml(input, {
        path: '/ca/fr_ca/recipes/chicken.html',
        log: console,
        metadataModifiers,
      });
      assert.ok(html.includes('<meta name="nav" content="/ca/fr_ca/nav/nav">'));
      assert.ok(html.includes('<meta name="footer" content="/ca/fr_ca/footer/footer">'));
      assert.ok(html.includes('<meta name="template" content="recipe">'));
      assert.ok(!html.includes('content="section"'));
    });

    it('lets local page metadata override a sheet value for the same name', async () => {
      const metadataModifiers = buildMetadataModifiers([
        { URL: '/x/**', template: 'recipe' },
      ]);
      const input = '<body><main>'
        + '<div><h1>T</h1></div>'
        + '<div><div class="metadata">'
        + '<div><div>Template</div><div>article</div></div>'
        + '</div></div>'
        + '</main></body>';
      const html = await renderContentHtml(input, {
        path: '/x/page.html',
        log: console,
        metadataModifiers,
      });
      assert.ok(html.includes('<meta name="template" content="article">'));
      assert.ok(!html.includes('content="recipe"'));
    });
  });

  describe('section metadata', () => {
    it('turns a section-metadata block into classes/data-attributes on the section, and strips it', async () => {
      const input = '<body><main><div>'
        + '<h1>Ramen</h1>'
        + '<div class="section-metadata">'
        + '<div><div>style</div><div>highlight, dark</div></div>'
        + '<div><div>background</div><div>blue</div></div>'
        + '</div>'
        + '</div></main></body>';
      const html = await renderContentHtml(input, { path: '/recipe.html', log: console });
      assert.ok(!html.includes('class="section-metadata"'));
      assert.ok(html.includes('class="highlight dark"'));
      assert.ok(html.includes('data-background="blue"'));
    });
  });

  describe('.plain.html', () => {
    it('returns the processed fragment, not a full document, for a .plain.html path', async () => {
      const input = '<body><main><div><p>Hello :smile: world</p></div></main></body>';
      const html = await renderContentHtml(input, { path: '/foo.plain.html', log: console });
      assert.ok(!/<!doctype html>/i.test(html), 'should not be a full document');
      assert.ok(!html.includes('<head'));
      assert.ok(html.includes('<span class="icon icon-smile"></span>'));
    });
  });

  describe('error fallback', () => {
    it('returns null instead of throwing when the pipeline fails to render', async () => {
      const input = '<html><head><script type="application/ld+json">{not valid json</script></head>'
        + '<body><main><div><p>hi</p></div></main></body></html>';
      const html = await renderContentHtml(input, { path: '/broken.html', log: { warn() {}, info() {} } });
      assert.strictEqual(html, null);
    });
  });
});
