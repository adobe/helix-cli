/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const URI = require('uri-js');
const hash = require('object-hash');

/**
 * Generates a backend JSON definition for a given
 * origin URL.
*/
function backend(uri) {
  const backenduri = URI.parse(uri);
  return {
    hostname: backenduri.host,
    error_threshold: 0,
    first_byte_timeout: 15000,
    weight: 100,
    address: backenduri.host,
    connect_timeout: 1000,
    name: `Proxy${backenduri.host.replace(/[^\w]/g, '')}${hash(backenduri).substr(0, 4)}`,
    port: backenduri.port || 443,
    between_bytes_timeout: 10000,
    shield: 'iad-va-us',
    ssl_cert_hostname: backenduri.host,
    max_conn: 200,
    use_ssl: backenduri.scheme === 'https',
  };
}

function conditions(strain) {
  if (strain.url) {
    const uri = URI.parse(strain.url);
    if (uri.path && uri.path !== '/') {
      const pathname = uri.path.replace(/\/$/, '');
      return Object.assign({
        sticky: false,
        condition: `req.http.Host == "${uri.host}" && (req.url.dirname ~ "^${pathname}$" || req.url.dirname ~ "^${pathname}/")`,
        vcl: `
  set req.http.X-Dirname = regsub(req.url.dirname, "^${pathname}", "");`,
      }, strain);
    }
    return Object.assign({
      condition: `req.http.Host == "${uri.host}"`,
    }, strain);
  }
  if (strain.condition && strain.sticky === undefined) {
    return Object.assign({
      sticky: true,
    }, strain);
  }
  return strain;
}

/**
 * Creates a VCL snippet for Proxy Strains that tells the
 * downstream processing that this is a proxy strain and
 * what the backend is that should handle the requests.
 */
function proxy(strain) {
  if (strain.type === 'proxy') {
    const vcl = `${strain.vcl || ''}
  # Enable passing through of requests

  set req.http.X-Proxy = "${strain.content.origin}";
  set req.http.X-Static = "Proxy";

  set req.backend = F_${backend(strain.content.origin).name};

`;
    return Object.assign(strain, { vcl });
  }
  return strain;
}

function resolve(strains) {
  let retvcl = '# This file handles the strain resolution\n';
  const strainconditions = strains
    .map(conditions)
    .map(proxy)
    .filter(strain => strain.condition)
    .map(({
      condition, name, vcl = '', sticky = false,
    }) => `if (${condition}) {
  set req.http.X-Sticky = "${sticky}";
  set req.http.X-Strain = "${name}";${vcl}
} else `);
  if (strainconditions.length) {
    retvcl += strainconditions.join('');
    retvcl += `{
  set req.http.X-Strain = "default";
}`;
  } else {
    retvcl += 'set req.http.X-Strain = "default";\n';
  }
  return retvcl;
}


module.exports = { conditions, resolve };
