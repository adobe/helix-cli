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
import {
  normalizePathForMetadataMatch,
  compileMetadataSheetPatterns,
  mergeMetadataSheetRows,
} from '../src/server/MetadataSheetSupport.js';

describe('MetadataSheetSupport', () => {
  it('normalizePathForMetadataMatch strips .html', () => {
    assert.strictEqual(normalizePathForMetadataMatch('/a/b/c.html'), '/a/b/c');
    assert.strictEqual(normalizePathForMetadataMatch('/x'), '/x');
  });

  it('mergeMetadataSheetRows uses template from specific row and nav from broader when specific leaves nav empty', () => {
    const rows = [
      { URL: '/ca/fr_ca/**', nav: '/nav1', template: 'broad' },
      { URL: '/ca/fr_ca/recipes/**', nav: '', template: 'recipe' },
    ];
    const compiled = compileMetadataSheetPatterns(rows);
    const hit = mergeMetadataSheetRows('/ca/fr_ca/recipes/chicken', compiled);
    assert.ok(hit);
    assert.strictEqual(hit.template, 'recipe');
    assert.strictEqual(hit.nav, '/nav1');
  });

  it('mergeMetadataSheetRows returns broader rule when specific does not match', () => {
    const rows = [
      { URL: '/ca/fr_ca/**', nav: '/nav1', template: 'section' },
      { URL: '/ca/fr_ca/recipes/**', template: 'recipe' },
    ];
    const compiled = compileMetadataSheetPatterns(rows);
    const hit = mergeMetadataSheetRows('/ca/fr_ca/about', compiled);
    assert.ok(hit);
    assert.strictEqual(hit.template, 'section');
    assert.strictEqual(hit.nav, '/nav1');
  });
});
