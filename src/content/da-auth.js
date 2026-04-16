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
import http from 'http';
import path from 'path';
import fse from 'fs-extra';
import open from 'open';
import { ensureGitIgnored } from './content-git.js';

const IMS_ORIGIN = 'https://ims-na1.adobelogin.com';
const CLIENT_ID = 'darkalley';
const SCOPE = 'ab.manage,AdobeID,gnav,openid,org.read,read_organizations,session,aem.frontend.all,additional_info.ownerOrg,additional_info.projectedProductContext,account_cluster.read';
const CALLBACK_PORT = 9898;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;

/** Token file stored in the project's .hlx folder, alongside the site token. */
export const DA_TOKEN_FILE = path.join('.hlx', '.da-token.json');

// ─── Token storage ───────────────────────────────────────────────────────────

async function loadStoredToken(tokenFile) {
  if (!await fse.pathExists(tokenFile)) {
    return null;
  }
  try {
    return await fse.readJson(tokenFile);
  } catch {
    return null;
  }
}

/**
 * Saves the DA token to the project's .hlx folder and ensures the file is git-ignored,
 * following the same pattern as saveSiteTokenToFile in config-utils.js.
 * @param {string} projectDir
 * @param {object} tokenData
 */
async function saveDaTokenToFile(projectDir, tokenData) {
  const tokenFile = path.join(projectDir, DA_TOKEN_FILE);
  await fse.ensureDir(path.dirname(tokenFile));
  await fse.writeJson(tokenFile, tokenData, { spaces: 2 });

  await ensureGitIgnored(projectDir, DA_TOKEN_FILE);
}

// ─── Token validity ──────────────────────────────────────────────────────────

function isTokenExpired(stored) {
  if (stored.expires_at) {
    // 60 second early buffer for clock skew
    return Date.now() >= (stored.expires_at - 60_000);
  }
  // legacy stored tokens without expires_at — treat as expired
  return true;
}

// ─── OAuth flow ──────────────────────────────────────────────────────────────

/**
 * Starts a local HTTP server that handles the implicit flow callback.
 *
 * IMS redirects to http://localhost:{port}/callback#access_token=TOKEN
 * The fragment never reaches the server, so /callback serves a tiny HTML page
 * that reads the fragment via JS and forwards the token to /token, then
 * redirects the browser to https://tools.aem.live/cli/logged-in on success.
 *
 * @returns {Promise<{token: string, expiresIn: number|null}>}
 */
function waitForToken() {
  return new Promise((resolve, reject) => {
    let timeout;
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);

      // Step 1: IMS lands here with the token in the fragment.
      // Serve a page that extracts it and calls /token.
      if (url.pathname === '/callback') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html><html><head><title>Logging in...</title></head><body>
<script>
  const p = new URLSearchParams(window.location.hash.substring(1));
  const token = p.get('access_token');
  const expiresIn = p.get('expires_in');
  const error = p.get('error');
  const dest = token
    ? '/token?access_token=' + encodeURIComponent(token) + (expiresIn ? '&expires_in=' + encodeURIComponent(expiresIn) : '')
    : '/token?error=' + encodeURIComponent(error || 'unknown');
  const loggedInUrl = 'https://tools.aem.live/cli/logged-in';
  if (!token) {
    fetch(dest);
    document.body.innerHTML = '<h2>Login failed.</h2>';
    const errP = document.createElement('p');
    errP.textContent = error || 'Unknown error';
    document.body.appendChild(errP);
  } else {
    fetch(dest)
      .then(() => { window.location.href = loggedInUrl; })
      .catch(() => {
        document.body.innerHTML = '<h2>Login failed.</h2><p>Could not complete login.</p>';
      });
  }
</script></body></html>`);
        return;
      }

      // Step 2: the page above calls /token with the token as a query param.
      if (url.pathname === '/token') {
        const token = url.searchParams.get('access_token');
        const expiresIn = url.searchParams.get('expires_in');
        const error = url.searchParams.get('error');
        res.writeHead(200);
        res.end();
        clearTimeout(timeout);
        server.close();
        if (token) {
          resolve({ token, expiresIn: expiresIn ? parseInt(expiresIn, 10) : null });
        } else {
          reject(new Error(`Login failed: ${error || 'unknown error'}`));
        }
        return;
      }

      res.writeHead(404);
      res.end();
    });

    server.listen(CALLBACK_PORT, 'localhost');
    server.on('error', (err) => reject(new Error(`Could not start callback server on port ${CALLBACK_PORT}: ${err.message}`)));

    timeout = setTimeout(() => {
      server.close();
      reject(new Error('Login timed out (5 minutes). Please try again.'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Runs the implicit OAuth login flow.
 * @param {object} log
 * @param {string} projectDir
 * @returns {Promise<string>} access token
 */
async function login(log, projectDir) {
  const params = new URLSearchParams({
    response_type: 'token',
    client_id: CLIENT_ID,
    scope: SCOPE,
    redirect_uri: REDIRECT_URI,
  });
  const authUrl = `${IMS_ORIGIN}/ims/authorize/v2?${params}`;

  log.info('Opening browser for da.live login...');
  log.info(`If the browser does not open automatically, visit:\n  ${authUrl}\n`);
  log.info('Waiting for login to complete...');

  await open(authUrl);

  const { token, expiresIn } = await waitForToken();

  await saveDaTokenToFile(projectDir, {
    access_token: token,
    expires_at: expiresIn ? Date.now() + (expiresIn * 1000) : null,
  });

  log.info(`Login successful. Token saved to ${path.join(projectDir, DA_TOKEN_FILE)}`);
  return token;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns a valid da.live access token. Triggers browser login if needed.
 *
 * Priority:
 *  1. Caller-supplied token (--token flag) — used as-is, not persisted
 *  2. Stored token in .hlx/.da-token.json that is still valid
 *  3. Full browser implicit login flow
 *
 * @param {object} log
 * @param {string} [override] token supplied via CLI --token flag
 * @param {string} projectDir project root directory (token stored in .hlx/ here)
 * @returns {Promise<string>} valid access token
 */
export async function getValidToken(log, override, projectDir) {
  if (override) {
    return override;
  }

  const tokenFile = path.join(projectDir, DA_TOKEN_FILE);
  const stored = await loadStoredToken(tokenFile);

  if (stored?.access_token && !isTokenExpired(stored)) {
    return stored.access_token;
  }

  if (stored?.access_token) {
    log.info('Stored token has expired. Re-authenticating...');
  }

  return login(log, projectDir);
}
