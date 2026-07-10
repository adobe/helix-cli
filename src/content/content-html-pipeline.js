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
 * `html2md` -> `helix-html-pipeline` markdown-rendering chain, run locally by calling
 * `htmlPipe()` (the same entry point production uses) against a hand-built minimal pipeline
 * state and a fake in-memory content-bus loader.
 */

import { html2md } from '@adobe/helix-html2md';
import {
  PipelineState, PipelineRequest, PipelineResponse, htmlPipe,
} from '@adobe/helix-html-pipeline';

/**
 * `htmlPipe` treats a literal `.html` path (no selector) as a code-bus (statically deployed)
 * resource and skips markdown rendering entirely -- production only ever requests pages at
 * extension-less paths (`/foo`), reserving `.html` for real static files. `.plain.html` is
 * exempt: its `plain` selector already routes through the content-bus/markdown branch.
 * @param {string} path
 * @returns {string}
 */
function toContentPath(path) {
  if (path.endsWith('.plain.html')) {
    return path;
  }
  const clean = path.endsWith('.html') ? path.slice(0, -'.html'.length) : path;
  // a literal "index" path segment is a reserved internal artifact -- fetchContent rejects it
  // outright, so an index document maps back to its containing directory, same as "/".
  if (clean.endsWith('/index')) {
    return clean.slice(0, -'index'.length) || '/';
  }
  return clean;
}

/**
 * A minimal `s3Loader` stand-in. With no folder mapping configured, `htmlPipe` only ever
 * makes two content-bus lookups: the page's own markdown, and (if configured) the
 * metadata.json sheet for the `fetchSourcedMetadata` step.
 * @param {string} md
 * @param {object[]} metadataSheetRows
 * @returns {object}
 */
function createLocalLoader(md, metadataSheetRows) {
  return {
    async getObject(bucketId, key) {
      if (bucketId === 'helix-content-bus' && key.endsWith('/metadata.json')) {
        if (metadataSheetRows.length > 0) {
          return new PipelineResponse(JSON.stringify({ data: metadataSheetRows }));
        }
        return new PipelineResponse('', { status: 404 });
      }
      if (bucketId === 'helix-content-bus') {
        return new PipelineResponse(md);
      }
      return new PipelineResponse('', { status: 404 });
    },
    async headObject() {
      return new PipelineResponse('', { status: 404 });
    },
  };
}

/**
 * @param {string} rawHtml body-only or partial HTML from content/, as stored by da.live
 * @param {object} [options]
 * @param {string} [options.path] request path, e.g. `/foo.html` or `/foo.plain.html`
 * @param {Console} [options.log]
 * @param {string} [options.headHtml] local head.html content, injected into <head>
 * @param {object[]} [options.metadataSheetRows] raw rows from the site's /metadata.json, fed
 *   through the same `fetchSourcedMetadata` step production uses to build sheet-based
 *   metadata overrides
 * @param {object} [options.headers] incoming request headers (e.g. `req.headers`), used to
 *   resolve a real host for canonical/og:url instead of a placeholder
 * @param {string} [options.org] the AEM org this content belongs to, if known
 * @param {string} [options.site] the AEM site this content belongs to, if known
 * @returns {Promise<string | null>} the rendered HTML (full document, or a bare fragment for
 *   `.plain.html` paths), or `null` if rendering failed and the caller should fall back to
 *   serving the raw file
 */
export async function renderContentHtml(rawHtml, {
  path = '/index.html',
  log = console,
  headHtml = '',
  metadataSheetRows = [],
  headers = {},
  org = 'local',
  site = 'local',
} = {}) {
  try {
    const md = await html2md(rawHtml, { log, url: new URL(path, 'http://localhost').href });

    const contentPath = toContentPath(path);
    const state = new PipelineState({
      path: contentPath,
      log,
      org: org || 'local',
      site: site || 'local',
      ref: 'local',
      partition: 'preview',
      s3Loader: createLocalLoader(md, metadataSheetRows),
      config: {
        contentBusId: 'local',
        owner: 'local',
        repo: 'local',
        cdn: {},
        metadata: { source: ['metadata.json'] },
        headers: {},
        features: { rendering: { version: 2 } },
        head: { html: headHtml },
      },
    });

    const req = new PipelineRequest(new URL(contentPath, 'http://localhost'), { headers });
    const res = await htmlPipe(state, req);
    if (res.error) {
      log.warn?.(`content-html-pipeline: failed to render ${path}: ${res.error}`);
      return null;
    }
    return res.body;
  } catch (e) {
    log.warn?.(`content-html-pipeline: failed to render ${path}: ${e.message}`);
    return null;
  }
}
