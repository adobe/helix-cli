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

/**
 * Transforms da.live-style `<div class="metadata">` blocks in content HTML into
 * `<meta>` tags for local dev (`aem up`), strips the block from the body, and
 * adds description / Open Graph / Twitter tags where data is available.
 */

import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import { select } from 'hast-util-select';
import { toHtml } from 'hast-util-to-html';

/** @typedef {import('hast').Root} HastRoot */
/** @typedef {import('hast').Element} HastElement */

const REHYPE_PARSE = { fragment: true };

/**
 * @param {string} s
 * @returns {string}
 */
export function escapeHtmlAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/**
 * @param {string} label
 * @returns {string}
 */
export function slugifyMetadataLabel(label) {
  return label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * @param {import('hast').Node | null | undefined} node
 * @returns {string}
 */
function textContent(node) {
  if (!node) {
    return '';
  }
  if (node.type === 'text') {
    return node.value;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((c) => textContent(c)).join('');
  }
  return '';
}

/**
 * @param {HastElement} metadataRoot
 * @returns {Array<[string, string]>}
 */
export function extractMetadataPairs(metadataRoot) {
  /** @type {Array<[string, string]>} */
  const pairs = [];
  if (!metadataRoot.children) {
    return pairs;
  }
  for (const row of metadataRoot.children) {
    if (row.type !== 'element' || row.tagName !== 'div') {
      // eslint-disable-next-line no-continue
      continue;
    }
    const cells = (row.children || []).filter(
      (c) => c.type === 'element' && c.tagName === 'div',
    );
    if (cells.length < 2) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const label = textContent(cells[0]).trim();
    const value = textContent(cells[1]).trim();
    if (label) {
      pairs.push([label, value]);
    }
  }
  return pairs;
}

/**
 * @param {HastElement} node
 * @param {string} className
 * @returns {boolean}
 */
function hasClass(node, className) {
  const cn = node.properties?.className;
  if (Array.isArray(cn)) {
    return cn.includes(className);
  }
  if (typeof cn === 'string') {
    return cn.split(/\s+/).includes(className);
  }
  return false;
}

/**
 * @param {import('hast').Node} tree
 * @param {import('hast').Element} target
 * @returns {boolean}
 */
function removeNode(tree, target) {
  if (tree === target) {
    return true;
  }
  if ('children' in tree && Array.isArray(tree.children)) {
    const { children } = tree;
    for (let i = 0; i < children.length; i += 1) {
      const c = children[i];
      if (c === target) {
        children.splice(i, 1);
        return true;
      }
      if (removeNode(c, target)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @param {HastRoot} tree
 * @param {string} tag
 * @returns {HastElement | null}
 */
function findFirstElement(tree, tag) {
  /** @type {HastElement | null} */
  let found = null;
  function walk(n) {
    if (found || !n) {
      return;
    }
    if (n.type === 'element' && n.tagName === tag) {
      found = n;
      return;
    }
    if ('children' in n && n.children) {
      n.children.forEach(walk);
    }
  }
  walk(tree);
  return found;
}

/**
 * @param {HastRoot} tree
 * @returns {string}
 */
function firstImgSrc(tree) {
  /** @type {string | null} */
  let src = null;
  function walk(n) {
    if (src || !n) {
      return;
    }
    if (n.type === 'element' && n.tagName === 'img') {
      const s = n.properties?.src;
      if (typeof s === 'string' && s.length > 0) {
        src = s;
      }
    }
    if ('children' in n && n.children) {
      n.children.forEach(walk);
    }
  }
  walk(tree);
  return src || '';
}

/**
 * @param {HastRoot} tree
 * @returns {string}
 */
function firstParagraphText(tree) {
  const p = findFirstElement(tree, 'p');
  const t = p ? textContent(p).trim() : '';
  return t;
}

/**
 * @param {string} s
 * @param {number} max
 * @returns {string}
 */
function truncateMetaText(s, max) {
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, max - 1).trim()}…`;
}

const SEO_LABEL_SKIP = new Set(['title', 'description', 'image']);

/**
 * @param {object | null | undefined} sheetRow row from /metadata.json matched for this URL
 * @param {Set<string> | null | undefined} excludeMetaNames lowercase meta `name` values to skip
 *   (local page wins)
 * @returns {string[]}
 */
export function buildSheetMetaLines(sheetRow, excludeMetaNames) {
  if (!sheetRow || typeof sheetRow !== 'object') {
    return [];
  }
  /** @type {string[]} */
  const lines = [];
  for (const [k, v] of Object.entries(sheetRow)) {
    if (k === 'URL' || k.startsWith(':')) {
      // eslint-disable-next-line no-continue
      continue;
    }
    if (excludeMetaNames && excludeMetaNames.has(k.toLowerCase())) {
      // eslint-disable-next-line no-continue
      continue;
    }
    if (v === undefined || v === null) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const s = String(v).trim();
    if (!s) {
      // eslint-disable-next-line no-continue
      continue;
    }
    lines.push(`<meta name="${escapeHtmlAttr(k)}" content="${escapeHtmlAttr(s)}">`);
  }
  return lines;
}

/**
 * @param {string[]} lines
 * @returns {string}
 */
function joinMetaLines(lines) {
  return lines.length > 0 ? `\n${lines.join('\n')}\n` : '';
}

/**
 * @param {string} htmlFragment body-only or partial HTML from content/
 * @param {{ absolutePageUrl?: string, sheetRow?: object | null }} [options]
 * @returns {{ htmlFragment: string, metaTagsHtml: string }}
 */
export function transformContentMetadataHtml(htmlFragment, options = {}) {
  const { absolutePageUrl = '', sheetRow = null } = options;

  let tree;
  try {
    tree = unified().use(rehypeParse, REHYPE_PARSE).parse(htmlFragment);
  } catch {
    return { htmlFragment, metaTagsHtml: joinMetaLines(buildSheetMetaLines(sheetRow)) };
  }

  const metadataEl = select('div.metadata', tree);
  if (!metadataEl || metadataEl.type !== 'element' || !hasClass(metadataEl, 'metadata')) {
    return { htmlFragment, metaTagsHtml: joinMetaLines(buildSheetMetaLines(sheetRow)) };
  }

  const pairs = extractMetadataPairs(metadataEl);

  /** Names from page metadata; sheet entries with the same meta name are skipped. */
  const localPairMetaNames = new Set();
  for (const [label, value] of pairs) {
    const slug = slugifyMetadataLabel(label);
    if (!slug || value === undefined) {
      // eslint-disable-next-line no-continue
      continue;
    }
    localPairMetaNames.add(slug);
  }

  const sheetLines = buildSheetMetaLines(sheetRow, localPairMetaNames);

  const lowerMap = new Map(pairs.map(([k, v]) => [k.toLowerCase().trim(), v]));

  removeNode(tree, metadataEl);

  const title = (lowerMap.get('title') || textContent(findFirstElement(tree, 'h1')).trim() || '').trim();
  let description = (lowerMap.get('description') || firstParagraphText(tree) || '').trim();
  description = truncateMetaText(description, 200);
  const image = (lowerMap.get('image') || lowerMap.get('og image') || firstImgSrc(tree) || '').trim();

  /** @type {string[]} */
  const seoLines = [];

  if (description) {
    const e = escapeHtmlAttr(description);
    seoLines.push(`<meta name="description" content="${e}">`);
    seoLines.push(`<meta property="og:description" content="${e}">`);
    seoLines.push(`<meta name="twitter:description" content="${e}">`);
  }

  if (title) {
    const e = escapeHtmlAttr(title);
    seoLines.push(`<meta property="og:title" content="${e}">`);
    seoLines.push(`<meta name="twitter:title" content="${e}">`);
  }

  if (absolutePageUrl) {
    seoLines.push(`<meta property="og:url" content="${escapeHtmlAttr(absolutePageUrl)}">`);
  }

  if (image) {
    const e = escapeHtmlAttr(image);
    const alt = escapeHtmlAttr(title || 'image');
    seoLines.push(`<meta property="og:image" content="${e}">`);
    seoLines.push(`<meta property="og:image:secure_url" content="${e}">`);
    seoLines.push(`<meta property="og:image:alt" content="${alt}">`);
    seoLines.push('<meta name="twitter:card" content="summary_large_image">');
    seoLines.push(`<meta name="twitter:image" content="${e}">`);
  } else {
    seoLines.push('<meta name="twitter:card" content="summary">');
  }

  /** @type {string[]} */
  const pairLines = [];
  for (const [label, value] of pairs) {
    const key = label.toLowerCase().trim();
    if (SEO_LABEL_SKIP.has(key)) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const slug = slugifyMetadataLabel(label);
    if (!slug || value === undefined) {
      // eslint-disable-next-line no-continue
      continue;
    }
    pairLines.push(
      `<meta name="${escapeHtmlAttr(slug)}" content="${escapeHtmlAttr(value)}">`,
    );
  }

  // SEO first, then sheet (fields not overridden by local pairs), then local page metadata
  const allLines = [...seoLines, ...sheetLines, ...pairLines];
  const htmlOut = toHtml(tree);
  return { htmlFragment: htmlOut, metaTagsHtml: joinMetaLines(allLines) };
}
