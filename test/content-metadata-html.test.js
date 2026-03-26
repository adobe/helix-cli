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
import { select } from 'hast-util-select';
import rehypeParse from 'rehype-parse';
import { unified } from 'unified';
import {
  transformContentMetadataHtml,
  slugifyMetadataLabel,
  extractMetadataPairs,
  escapeHtmlAttr,
  buildSheetMetaLines,
} from '../src/server/content-metadata-html.js';

describe('content-metadata-html', () => {
  it('slugifyMetadataLabel', () => {
    assert.strictEqual(slugifyMetadataLabel('Total Time'), 'total-time');
    assert.strictEqual(slugifyMetadataLabel('Recipe Type'), 'recipe-type');
  });

  it('escapeHtmlAttr', () => {
    assert.strictEqual(escapeHtmlAttr('a"b&c'), 'a&quot;b&amp;c');
  });

  it('extractMetadataPairs parses label/value rows', () => {
    const tree = unified()
      .use(rehypeParse, { fragment: true })
      .parse(
        '<div class="metadata">'
        + '<div><div><p>Yield</p></div><div><p>4</p></div></div>'
        + '</div>',
      );
    const el = select('div.metadata', tree);
    assert.ok(el && el.type === 'element');
    const pairs = extractMetadataPairs(/** @type {import("hast").Element} */ (el));
    assert.deepStrictEqual(pairs, [['Yield', '4']]);
  });

  it('removes metadata div and emits meta tags', () => {
    const input = '<body><h1>Ramen</h1>'
      + '<div class="metadata">'
      + '<div><div><p>Total Time</p></div><div><p>00:17:30</p></div></div>'
      + '<div><div><p>Yield</p></div><div><p>4 portions</p></div></div>'
      + '</div></body>';
    const { htmlFragment, metaTagsHtml } = transformContentMetadataHtml(input, {
      absolutePageUrl: 'https://example.com/recipe',
    });
    assert.ok(!htmlFragment.includes('metadata'));
    assert.ok(!htmlFragment.includes('00:17:30'));
    assert.ok(metaTagsHtml.includes('name="total-time"'));
    assert.ok(metaTagsHtml.includes('content="00:17:30"'));
    assert.ok(metaTagsHtml.includes('name="yield"'));
    assert.ok(metaTagsHtml.includes('property="og:title"'));
    assert.ok(metaTagsHtml.includes('content="Ramen"'));
    assert.ok(metaTagsHtml.includes('property="og:url"'));
    assert.ok(metaTagsHtml.includes('https://example.com/recipe'));
  });

  it('uses Description row for description metas', () => {
    const input = '<main><p>ignored</p></main><div class="metadata">'
      + '<div><div><p>Description</p></div><div><p>Short desc here</p></div></div>'
      + '</div>';
    const { metaTagsHtml } = transformContentMetadataHtml(input, {});
    assert.ok(metaTagsHtml.includes('name="description"'));
    assert.ok(metaTagsHtml.includes('Short desc here'));
    assert.ok(metaTagsHtml.includes('property="og:description"'));
  });

  it('returns input unchanged when no metadata block', () => {
    const input = '<body><p>x</p></body>';
    const { htmlFragment, metaTagsHtml } = transformContentMetadataHtml(input, {});
    assert.strictEqual(htmlFragment, input);
    assert.strictEqual(metaTagsHtml, '');
  });

  it('injects sheet metas without body metadata div', () => {
    const input = '<body><p>hi</p></body>';
    const { htmlFragment, metaTagsHtml } = transformContentMetadataHtml(input, {
      sheetRow: {
        URL: '/x/**', nav: '/nav', template: 'recipe', ':type': 'sheet',
      },
    });
    assert.strictEqual(htmlFragment, input);
    assert.ok(metaTagsHtml.includes('name="nav"'));
    assert.ok(metaTagsHtml.includes('name="template"'));
    assert.ok(!metaTagsHtml.includes(':type'));
  });

  it('places sheet metas after SEO block and before body pairs', () => {
    const input = '<body><h1>T</h1><div class="metadata">'
      + '<div><div><p>Yield</p></div><div><p>1</p></div></div>'
      + '</div></body>';
    const { metaTagsHtml } = transformContentMetadataHtml(input, {
      sheetRow: { nav: '/n', template: 'recipe' },
    });
    const idxOg = metaTagsHtml.indexOf('og:title');
    const idxNav = metaTagsHtml.indexOf('name="nav"');
    const idxYield = metaTagsHtml.indexOf('name="yield"');
    assert.ok(idxOg >= 0 && idxNav > idxOg && idxYield > idxNav);
  });

  it('omits sheet meta when the page metadata div defines the same name', () => {
    const input = '<body><h1>T</h1><div class="metadata">'
      + '<div><div><p>Template</p></div><div><p>article</p></div></div>'
      + '</div></body>';
    const { metaTagsHtml } = transformContentMetadataHtml(input, {
      sheetRow: { nav: '/n', template: 'recipe' },
    });
    assert.ok(metaTagsHtml.includes('name="template"'));
    assert.ok(metaTagsHtml.includes('content="article"'));
    assert.ok(!metaTagsHtml.includes('content="recipe"'));
    assert.ok(metaTagsHtml.includes('name="nav"'));
  });
});

describe('buildSheetMetaLines', () => {
  it('skips URL and keys starting with colon', () => {
    const lines = buildSheetMetaLines({ URL: '/a', ':type': 'sheet', nav: '/n' });
    assert.strictEqual(lines.length, 1);
    assert.ok(lines[0].includes('nav'));
  });

  it('skips names in exclude set', () => {
    const lines = buildSheetMetaLines(
      { nav: '/a', template: 'recipe' },
      new Set(['template']),
    );
    assert.strictEqual(lines.length, 1);
    assert.ok(lines[0].includes('nav'));
  });
});
