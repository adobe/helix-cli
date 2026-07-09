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
 * Renders da.live-authored content HTML from `content/` the way production does: through the
 * real `html2md` -> `helix-html-pipeline` markdown-rendering chain, run locally against a
 * hand-built minimal pipeline state (no S3 loader, no network, no live site config). This
 * replaces hand-porting individual pipeline steps (icons, page metadata, section metadata)
 * one at a time, so local preview can't drift from what production actually renders.
 */

import { html2md } from '@adobe/helix-html2md';
import {
  PipelineState, PipelineRequest, PipelineResponse,
} from '@adobe/helix-html-pipeline';
/* eslint-disable import/no-unresolved, import/extensions */
import { Modifiers } from '@adobe/helix-html-pipeline/src/utils/modifiers.js';
import initConfig from '@adobe/helix-html-pipeline/src/steps/init-config.js';
import parseMarkdown from '@adobe/helix-html-pipeline/src/steps/parse-markdown.js';
import splitSections from '@adobe/helix-html-pipeline/src/steps/split-sections.js';
import getMetadata from '@adobe/helix-html-pipeline/src/steps/get-metadata.js';
import unwrapSoleImages from '@adobe/helix-html-pipeline/src/steps/unwrap-sole-images.js';
import makeHtml from '@adobe/helix-html-pipeline/src/steps/make-html.js';
import rewriteUrls from '@adobe/helix-html-pipeline/src/steps/rewrite-urls.js';
import fixSections from '@adobe/helix-html-pipeline/src/steps/fix-sections.js';
import createPageBlocks from '@adobe/helix-html-pipeline/src/steps/create-page-blocks.js';
import createPictures from '@adobe/helix-html-pipeline/src/steps/create-pictures.js';
import extractSectionMetadata from '@adobe/helix-html-pipeline/src/steps/extract-section-metadata.js';
import extractMetaData from '@adobe/helix-html-pipeline/src/steps/extract-metadata.js';
import rewriteIcons from '@adobe/helix-html-pipeline/src/steps/rewrite-icons.js';
import addHeadingIds from '@adobe/helix-html-pipeline/src/steps/add-heading-ids.js';
import render from '@adobe/helix-html-pipeline/src/steps/render.js';
import stringify from '@adobe/helix-html-pipeline/src/steps/stringify-response.js';
/* eslint-enable import/no-unresolved, import/extensions */

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

    await parseMarkdown(state);
    await splitSections(state);
    await getMetadata(state);
    await unwrapSoleImages(state);
    await makeHtml(state);
    await rewriteUrls(state);
    await fixSections(state);
    await createPageBlocks(state);
    await createPictures(state);
    await extractSectionMetadata(state);
    await extractMetaData(state, req);
    await rewriteIcons(state);
    await addHeadingIds(state);
    await render(state, req, res);
    await stringify(state, req, res);

    return res.body;
  } catch (e) {
    log.warn?.(`content-html-pipeline: failed to render ${path}: ${e.message}`);
    return null;
  }
}
