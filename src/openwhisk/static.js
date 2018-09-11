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
// eslint-disable-next-line import/no-extraneous-dependencies
const request = require('request-promise');
const crypto = require('crypto');
const mime = require('mime-types');
/* eslint-disable no-console */

function error(message, code = 500) {
  console.error('delivering error', message, code);
  return {
    statusCode: code,
    headers: {
      'Content-Type': 'text/html',
      'X-Static': 'Raw/Static',
    },
    body: `Error ${code}: ${message}`,
  };
}

function addHeaders(headers, ref, content) {
  let cacheheaders = {};
  if (ref.match(/[a-f0-9]{40}/)) {
    cacheheaders = {
      'Cache-Control': 'max-age=131400',
    };
  } else if (content) {
    const hash = crypto.createHash('md5').update(content);
    cacheheaders = {
      ETag: `"${hash.digest('base64')}"`,
      'Cache-Control': 's-max-age=300',
    };
  }
  return Object.assign(headers, cacheheaders);
}


function isBinary(type) {
  if (type.match(/text\/.*/)) {
    return false;
  }
  if (type.match(/.*\/javascript/)) {
    return false;
  }
  if (type.match(/.*\/.*json/)) {
    return false;
  }
  if (type.match(/.*\/.*xml/)) {
    return false;
  }
  return true;
}

function isJSON(type) {
  return !!type.match(/json/);
}

function getBody(type, responsebody) {
  if (isBinary(type)) {
    return Buffer.from(responsebody).toString('base64');
  }
  if (isJSON(type)) {
    return JSON.parse(responsebody);
  }
  return responsebody.toString();
}

function forbidden() {
  return {
    statusCode: 403,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'max-age=300', // don't bother us for the next five minutes
    },
    body: 'forbidden.',
  };
}

function staticBase(owner, repo, entry, ref, strain = 'default') {
  return `__HLX/${owner}/${repo}/${strain}/${ref}/${entry}/DIST__`;
}

function deliverPlain(owner, repo, ref, entry, root) {
  const cleanentry = (`${root}/${entry}`).replace(/^\//, '').replace(/[/]+/g, '/');
  console.log('deliverPlain()', owner, repo, ref, cleanentry);
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${cleanentry}`;
  const rawopts = {
    url,
    headers: {
      'User-Agent': 'Project Helix Static',
    },
    resolveWithFullResponse: true,
    encoding: null,
  };

  return request.get(rawopts).then((response) => {
    const type = mime.lookup(cleanentry) || 'application/octet-stream';
    const size = parseInt(response.headers['content-length'], 10);
    console.log('size', size);
    if (size < 3000) {
      const body = getBody(type, response.body);
      console.log(`delivering file ${cleanentry} type ${type} binary: ${isBinary(type)}`);
      return {
        headers: addHeaders({
          'Content-Type': type,
          'X-Static': 'Raw/Static',
        }, ref, response.body),
        body,
      };
    }
    console.log('Redirecting to GitHub');
    return {
      statusCode: 307,
      headers: {
        Location: url,
        'X-Content-Type': type,
        'X-Static': 'Raw/Static',
      },
    };
  }).catch((rqerror) => {
    console.error('REQUEST FAILED', rqerror.response.body.toString());
    if (rqerror.statusCode === 404) {
      return error(rqerror.response.body.toString(), 404);
    }
    return error(rqerror.message, rqerror.statusCode);
  });
}

/**
 * The blacklist of paths that may never be served
 * @param {*} path
 */
function blacklisted(path, allow, deny) {
  const whitelist = allow ? new RegExp(allow) : false;
  const blacklist = deny ? new RegExp(deny) : false;

  if (whitelist) {
    return !(whitelist.test(path)) || blacklisted(path, undefined, deny);
  }
  if (blacklist) {
    return blacklist.test(path) || blacklisted(path);
  }
  if (/^(.*\/?)package\.json$/.test(path)) {
    return true;
  }
  if (/^(.*\/?)helix-config\.yaml$/.test(path)) {
    return true;
  }
  if (/(^|\/)\..+/.test(path)) {
    return true;
  }
  if (/^\/?src\//.test(path)) {
    return true;
  }
  return false;
}
/**
 *
 * @param {Object} params The OpenWhisk payload
 * @param {string} params.owner Repository owner on GitHub
 * @param {string} params.repo Repository name on GitHub
 * @param {string} params.ref SHA of a commit or name of a branch or tag on GitHub
 * @param {string} params.path path to the requested file (if used with `entry`)
 * @param {string} params.entry path to the file requested by the browser
 * @param {boolean} params.plain disable asset pre-processing with Parcel
 * @param {string} params.allow regular expression pattern that all delivered files must follow
 * @param {string} params.deny regular expression pattern that all delivered files may not follow
 * @param {string} params.root document root for all static files in the repository
 */
async function main({
  owner,
  repo,
  ref = 'master',
  path,
  entry,
  strain = 'default',
  plain = false,
  allow,
  deny,
  root = '',
}) {
  console.log('main()', owner, repo, ref, path, entry, strain, plain, allow, deny, root);

  if (blacklisted(path, allow, deny) || blacklisted(entry, allow, deny)) {
    return forbidden();
  }

  if (plain) {
    return deliverPlain(owner, repo, ref, entry, root);
  }

  return forbidden();
}

module.exports = {
  main, error, addHeaders, isBinary, staticBase, blacklisted,
};
