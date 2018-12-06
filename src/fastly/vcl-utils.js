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

function conditions([strain, vcl]) {
  if (strain.url) {
    const uri = URI.parse(strain.url);
    if (uri.path && uri.path !== '/') {
      const pathname = uri.path.replace(/\/$/, '');
      const body = vcl.body || [];
      body.push(`set req.http.X-Dirname = regsub(req.url.dirname, "^${pathname}", "");`);
      return [strain, {
        sticky: false,
        condition: `req.http.Host == "${uri.host}" && (req.url.dirname ~ "^${pathname}$" || req.url.dirname ~ "^${pathname}/")`,
        body,
      }];
    }
    return [strain, {
      condition: `req.http.Host == "${uri.host}"`,
    }, strain];
  }
  if (strain.condition && strain.sticky === undefined) {
    return [strain, {
      sticky: true,
    }];
  }
  return [strain, vcl];
}

/**
 * Creates a VCL snippet for Proxy Strains that tells the
 * downstream processing that this is a proxy strain and
 * what the backend is that should handle the requests.
 */
function proxy([strain, vcl]) {
  if (strain.origin && typeof strain.origin === 'object') {
    const body = vcl.body || [];
    body.push(`${vcl.body || ''}
  # Enable passing through of requests

  set req.http.X-Proxy = "${strain.origin.address}";
  set req.http.X-Static = "Proxy";

  set req.backend = F_${strain.origin.name};
`);
    return [strain, Object.assign(vcl, { body })];
  }
  return [strain, vcl];
}

/**
 * Generates the VCL snippet to set the X-Sticky header
 * @param {*} param0
 */
function stickybody([strain, argvcl]) {
  const vcl = argvcl;
  vcl.body = vcl.body || [];
  if (strain.sticky || vcl.sticky) {
    vcl.body.push('set req.http.X-Sticky = "true";');
  } else {
    vcl.body.push('set req.http.X-Sticky = "false";');
  }
  return [strain, vcl];
}

/**
 * Generates the VCL snippet to set the X-Name header
 * @param {*} param0
 */
function namebody([strain, vcl]) {
  vcl.body.push(`  set req.http.X-Strain = "${strain.name}";`);

  return [strain, vcl];
}


function resolve(mystrains) {
  const strains = mystrains instanceof Map ? Array.from(mystrains.values()) : mystrains;
  let retvcl = '# This file handles the strain resolution\n';
  const strainconditions = strains
    .map(strain => [strain, { body: [] }])
    .map(conditions)
    .map(proxy)
    .map(stickybody)
    .map(namebody)
    .filter(([strain, vcl]) => strain.condition || vcl.condition)
    .map(([strain, vcl]) => `if (${strain.condition || vcl.condition}) {
  ${vcl.body.join('\n')}
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
