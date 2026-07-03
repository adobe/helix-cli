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
 * da.live content-image auth bootstrap.
 * Only injected into pages that reference a *.preview.da.live host, since that host
 * requires an IMS-authenticated cookie. First checks whether the browser already has
 * a valid (non-expired) cookie for that host; only if not does it load IMS and either
 * forward the access token to /gimme_cookie, or send the browser through the CLI's own
 * /.aem/cli/da-login redirect (imslib's signIn() ignores this page's origin as the
 * redirect_uri — the darkalley IMS client only allows its fixed :9898 callback).
 * This script is self-contained and browser-compatible (no module system).
 */
(function iife() {
  var cfg = window.DaContentAuthConfig;
  if (!cfg || !cfg.previewOrigin || !cfg.clientId) {
    return;
  }

  // sendCookie() only ever runs after we've determined the browser had no valid
  // preview cookie, meaning any preview-host images on this page already fired
  // (and failed) before the cookie existed. Reload once so they're refetched with
  // the new cookie attached — without this, the page looks broken until the user
  // manually reloads.
  function sendCookie(token) {
    window.fetch(`${cfg.previewOrigin}/gimme_cookie`, {
      method: 'GET',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    }).then(function onResponse(res) {
      if (res.ok) {
        window.location.reload();
      }
    }).catch(function onError() {
      // non-fatal: images will fail to load, page still renders
    });
  }

  function redirectToLogin() {
    var returnUrl = window.location.href.split('#')[0];
    window.location.href = `/.aem/cli/da-login?return=${encodeURIComponent(returnUrl)}`;
  }

  function bootstrapIms() {
    window.adobeid = {
      client_id: cfg.clientId,
      scope: cfg.scope,
      environment: 'prod',
      autoValidateToken: true,
      useLocalStorage: true,
      onReady: function onReady() {
        var accessToken = window.adobeIMS.getAccessToken();
        if (accessToken) {
          sendCookie(accessToken.token);
        } else {
          redirectToLogin();
        }
      },
      onError: function onError() {
        // non-fatal: images will fail to load, page still renders
      },
    };
    var script = document.createElement('script');
    script.src = 'https://auth.services.adobe.com/imslib/imslib.min.js';
    document.head.appendChild(script);
  }

  // A credentialed request to an actual gated asset fails (401/403) whenever there's
  // no cookie yet or the existing one has expired — the server re-checks it every
  // request, so this alone covers both cases without us tracking expiry ourselves.
  // Probing the site root wouldn't work: it's often served regardless of auth, only
  // the assets themselves are gated.
  function hasValidCookie() {
    return window.fetch(`${cfg.previewOrigin}${cfg.probePath || '/'}`, {
      method: 'HEAD',
      credentials: 'include',
      cache: 'no-store',
    }).then(function onResponse(res) {
      return res.ok;
    }).catch(function onError() {
      return false;
    });
  }

  // Returning from the /.aem/cli/da-login round trip: the access token is in the URL fragment.
  var hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  var tokenFromRedirect = hashParams.get('access_token');
  if (tokenFromRedirect) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    sendCookie(tokenFromRedirect);
    return;
  }

  hasValidCookie().then(function onChecked(valid) {
    if (!valid) {
      bootstrapIms();
    }
  });
}());
