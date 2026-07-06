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
 * Rewrites da.live-style `:icon-name:` text in content HTML into
 * `<span class="icon icon-name"></span>` for local dev (`aem up`), mirroring
 * the same transform helix-html-pipeline applies server-side in production.
 */

import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import { toHtml } from 'hast-util-to-html';
// eslint-disable-next-line import/no-unresolved, import/extensions
import rewriteIcons from '@adobe/helix-html-pipeline/src/steps/rewrite-icons.js';

const REHYPE_PARSE = { fragment: true };

/**
 * @param {string} htmlFragment body-only or partial HTML from content/
 * @returns {string} the fragment with `:icon-name:` text rewritten to icon spans
 */
export function transformContentIconsHtml(htmlFragment) {
  let tree;
  try {
    tree = unified().use(rehypeParse, REHYPE_PARSE).parse(htmlFragment);
  } catch {
    return htmlFragment;
  }

  const before = toHtml(tree);
  rewriteIcons({ content: { hast: tree } });
  const after = toHtml(tree);

  // avoid reflowing untouched content (e.g. dropping the <body> wrapper on round-trip)
  return after === before ? htmlFragment : after;
}
