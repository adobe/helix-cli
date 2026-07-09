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
 * Renders da.live-authored content HTML from `content/` through the
 * `html2md` -> `helix-html-pipeline` markdown-rendering chain, run locally against a hand-built
 * minimal pipeline state.
 */

import { html2md } from '@adobe/helix-html2md';
import {
  PipelineState, PipelineRequest, PipelineResponse,
} from '@adobe/helix-html-pipeline';
import {
  Modifiers,
  initConfig,
  parseMarkdown,
  splitSections,
  getMetadata,
  unwrapSoleImages,
  html,
  rewriteUrls,
  fixSections,
  createPageBlocks,
  createPictures,
  extractSectionMetadata,
  extractMetaData,
  rewriteIcons,
  addHeadingIds,
  render,
  tohtml,
} from './html-pipeline-internals.js';

/**
 * @param {string} rawHtml body-only or partial HTML from content/, as stored by da.live
 * @param {object} [options]
 * @param {string} [options.path] request path, e.g. `/foo.html` or `/foo.plain.html`
 * @param {Console} [options.log]
 * @param {string} [options.headHtml] local head.html content, injected into <head>
 * @param {Modifiers} [options.metadataModifiers] sheet-based metadata overrides, matched by
 *   URL pattern (from the site's /metadata.json), in the same shape production uses
 * @param {object} [options.headers] incoming request headers (e.g. `req.headers`), used to
 *   resolve a real host for canonical/og:url instead of a placeholder
 * @returns {Promise<string | null>} the rendered HTML (full document, or a bare fragment for
 *   `.plain.html` paths), or `null` if rendering failed and the caller should fall back to
 *   serving the raw file
 */
export async function renderContentHtml(rawHtml, {
  path = '/index.html',
  log = console,
  headHtml = '',
  metadataModifiers = Modifiers.EMPTY,
  headers = {},
} = {}) {
  try {
    const url = new URL(path, 'http://localhost');
    const md = await html2md(rawHtml, { log, url: url.href });

    const state = new PipelineState({
      path,
      log,
      org: 'local',
      site: 'local',
      ref: 'local',
      partition: 'preview',
      config: {
        contentBusId: 'local',
        owner: 'local',
        repo: 'local',
        cdn: {},
        metadata: {},
        headers: {},
        features: { rendering: { version: 2 } },
        head: { html: headHtml },
      },
    });
    state.content.data = md;

    const req = new PipelineRequest(url, { headers });
    const res = new PipelineResponse();

    initConfig(state, req, res);
    // initConfig derives state.metadata from state.config.metadata, which we don't populate --
    // override with the caller's real sheet-based Modifiers instead.
    state.metadata = metadataModifiers;
    state.mappedMetadata = Modifiers.EMPTY;

    // Mirrors the step sequence in htmlPipe() (skipping stops not relevant to local rendering):
    // See for source https://github.com/adobe/helix-html-pipeline/blob/v6.29.6/src/html-pipe.js#L160-L179
    // List/order is copied, so there is a drift risk when the html-pipeline dependency is updated.
    await parseMarkdown(state);
    await splitSections(state);
    await getMetadata(state);
    await unwrapSoleImages(state);
    await html(state);
    await rewriteUrls(state);
    await fixSections(state);
    await createPageBlocks(state);
    await createPictures(state);
    await extractSectionMetadata(state);
    await extractMetaData(state, req);
    await rewriteIcons(state);
    await addHeadingIds(state);
    await render(state, req, res);
    await tohtml(state, req, res);

    return res.body;
  } catch (e) {
    log.warn?.(`content-html-pipeline: failed to render ${path}: ${e.message}`);
    return null;
  }
}
