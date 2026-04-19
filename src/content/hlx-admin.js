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

import { getFetch } from '../fetch-utils.js';

const HLX_ADMIN = 'https://admin.hlx.page';

/** Polling interval for admin.hlx.page job status (ms). */
const JOB_POLL_MS = 2000;

/** Max time to wait for a bulk job (ms). */
const JOB_TIMEOUT_MS = 45 * 60 * 1000;

/**
 * When the branch name contains slashes or uppercase letters, the Admin API expects a
 * `branch` query parameter; the path segment uses a placeholder ref (see AEM Admin API docs).
 * @param {string} ref
 * @returns {{ pathRef: string, search: string }}
 */
export function branchPathAndQuery(ref) {
  const needsBranchParam = ref.includes('/') || ref !== ref.toLowerCase();
  const pathRef = needsBranchParam ? 'main' : ref;
  const search = needsBranchParam ? `?branch=${encodeURIComponent(ref)}` : '';
  return { pathRef, search };
}

/**
 * Admin bulk preview/publish use extensionless web paths for HTML (see AEM routing).
 * Trailing `.html` (any case) is removed (e.g. `/a/page.html` → `/a/page`).
 * Other paths (e.g. `.json`, images) are unchanged.
 * @param {string} daPath path as on da.live
 * @returns {string}
 */
export function toAdminBulkPath(daPath) {
  return daPath.replace(/\.html$/i, '');
}

function bulkUrl(kind, org, site, ref) {
  const { pathRef, search } = branchPathAndQuery(ref);
  const enc = encodeURIComponent;
  return `${HLX_ADMIN}/${kind}/${enc(org)}/${enc(site)}/${enc(pathRef)}/*${search}`;
}

/**
 * @param {object} log logger with .info
 * @param {*} fetchImpl
 * @param {string} token Bearer token
 * @param {'preview'|'live'} kind
 * @param {string} org
 * @param {string} site
 * @param {string} ref git branch / site ref
 * @param {{ paths: string[], delete?: boolean, forceUpdate?: boolean }} body
 */
export async function startBulkJob(log, fetchImpl, token, kind, org, site, ref, body) {
  const url = bulkUrl(kind, org, site, ref);
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`admin API returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg = data.message || data.error || text || res.statusText;
    throw new Error(`Bulk ${kind} failed (${res.status}): ${msg}`);
  }
  const selfLink = data.links?.self;
  if (!selfLink) {
    throw new Error('Bulk job response missing links.self');
  }
  const jobUrl = String(selfLink).replace(/^<|>$/g, '');
  log.info(`  Job: ${jobUrl}`);
  return { jobUrl, raw: data };
}

/**
 * @param {object} log
 * @param {*} fetchImpl
 * @param {string} token
 * @param {string} jobUrl
 */
export async function waitForJob(log, fetchImpl, token, jobUrl) {
  const cleanUrl = String(jobUrl).replace(/^<|>$/g, '');
  const started = Date.now();

  /* eslint-disable no-await-in-loop, no-constant-condition */
  while (true) {
    if (Date.now() - started > JOB_TIMEOUT_MS) {
      throw new Error(`Timed out waiting for admin job: ${cleanUrl}`);
    }

    const res = await fetchImpl(cleanUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Job status HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Job status not JSON (${res.status}): ${text.slice(0, 200)}`);
    }

    const job = data.job || data;
    const {
      state,
      name = '',
      progress: prog = {},
    } = job;
    const {
      processed = 0,
      total = 0,
      failed = 0,
    } = prog;

    if (state === 'created' || state === 'running') {
      if (total > 0) {
        log.info(`  Job ${name} [${state}]: ${processed}/${total} (${failed} failed)`);
      } else {
        log.info(`  Job ${name} [${state}]…`);
      }
      await new Promise((resolve) => {
        setTimeout(resolve, JOB_POLL_MS);
      });
    } else if (failed > 0 || state === 'failed' || state === 'error') {
      throw new Error(
        `Job ended with failures (state=${state}, failed=${failed}). See ${cleanUrl}`,
      );
    } else {
      log.info(`  Job finished [${state || 'done'}]`);
      return job;
    }
  }
}

/**
 * Runs preview and/or live bulk jobs for the given path sets.
 * @param {object} opts
 * @param {object} opts.log
 * @param {string} opts.token
 * @param {string} opts.org
 * @param {string} opts.site
 * @param {string} opts.ref
 * @param {boolean} opts.preview
 * @param {boolean} opts.publish
 * @param {string[]} opts.upsertPaths paths to preview/publish (add/update)
 * @param {string[]} opts.deletePaths paths to remove from preview / unpublish
 */
export async function runBulkPreviewAndPublish(opts) {
  const {
    log,
    token,
    org,
    site,
    ref,
    preview,
    publish,
    upsertPaths,
    deletePaths,
  } = opts;

  const fetchImpl = getFetch(false);
  const wantPreview = preview || publish;
  const wantPublish = publish;

  if (!wantPreview) {
    return;
  }

  log.info('Starting bulk preview on admin.hlx.page…');

  if (upsertPaths.length > 0) {
    log.info(`  Preview ${upsertPaths.length} path(s) (update)…`);
    // eslint-disable-next-line no-await-in-loop
    const { jobUrl } = await startBulkJob(log, fetchImpl, token, 'preview', org, site, ref, {
      paths: upsertPaths,
      delete: false,
    });
    // eslint-disable-next-line no-await-in-loop
    await waitForJob(log, fetchImpl, token, jobUrl);
  }

  if (deletePaths.length > 0) {
    log.info(`  Preview ${deletePaths.length} path(s) (delete)…`);
    // eslint-disable-next-line no-await-in-loop
    const { jobUrl } = await startBulkJob(log, fetchImpl, token, 'preview', org, site, ref, {
      paths: deletePaths,
      delete: true,
    });
    // eslint-disable-next-line no-await-in-loop
    await waitForJob(log, fetchImpl, token, jobUrl);
  }

  if (!wantPublish) {
    return;
  }

  log.info('Starting bulk publish on admin.hlx.page…');

  if (upsertPaths.length > 0) {
    log.info(`  Publish ${upsertPaths.length} path(s) (update)…`);
    // eslint-disable-next-line no-await-in-loop
    const { jobUrl } = await startBulkJob(log, fetchImpl, token, 'live', org, site, ref, {
      paths: upsertPaths,
      delete: false,
    });
    // eslint-disable-next-line no-await-in-loop
    await waitForJob(log, fetchImpl, token, jobUrl);
  }

  if (deletePaths.length > 0) {
    log.info(`  Publish ${deletePaths.length} path(s) (delete)…`);
    // eslint-disable-next-line no-await-in-loop
    const { jobUrl } = await startBulkJob(log, fetchImpl, token, 'live', org, site, ref, {
      paths: deletePaths,
      delete: true,
    });
    // eslint-disable-next-line no-await-in-loop
    await waitForJob(log, fetchImpl, token, jobUrl);
  }
}
