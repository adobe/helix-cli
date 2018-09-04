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
const decompress = require('decompress');
const crypto = require('crypto');
const $ = require('shelljs');
const nodepath = require('path');
const Bundler = require('parcel-bundler');
const fs = require('fs-extra');
const mime = require('mime-types');
/* eslint-disable no-console */

function error(message) {
  console.error(message);
  return {
    statusCode: 500,
    headers: {
      'Content-Type': 'text/html',
    },
    body: `Error 500: Internal Server Error\n${message}`,
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
  const binary = isBinary(type);
  if (binary) {
    return responsebody.toString('base64');
  } if (isJSON(type)) {
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

function deliverStatic(pwd, hash, path, ref = false, repo) {
  return () => {
    $.cd(pwd);
    const distparent = nodepath.join(pwd, hash, 'dist');
    const rawparent = nodepath.join(pwd, hash, `${repo}-${ref}`);
    const distpath = nodepath.join(distparent, path);
    const rawpath = nodepath.join(rawparent, path);

    // nodepath.join returns normalized paths
    if (distpath.indexOf(distparent) !== 0 || rawpath.indexOf(rawparent) !== 0) {
      // someone is trying to break out of the assigned path.
      return forbidden();
    } if (fs.existsSync(distpath)) {
      const file = fs.readFileSync(distpath);
      const type = mime.lookup(distpath);
      const binary = isBinary(type);
      console.log(`delivering file ${distpath} type ${type} binary ${binary}`);
      const body = getBody(type, file);
      return {
        headers: addHeaders({
          'Content-Type': type,
          'X-Static': 'Codeload/Parcel',
          // 'Cache-Control': 'max-age=1314000',
        }, ref, body),
        body,
      };
    } if (fs.existsSync(rawpath)) {
      console.log('There is a fallback');
      const file = fs.readFileSync(rawpath);
      const type = mime.lookup(rawpath);
      const binary = isBinary(type);
      console.log(`delivering fallback file ${rawpath} type ${type} binary ${binary}`);
      const body = getBody(type, file);
      return {
        headers: addHeaders({
          'Content-Type': type,
          'X-Static': 'Codeload/Static',
          // 'Cache-Control': 'max-age=1314000',
        }, ref, body),
        body,
      };
    }
    console.error(`file ${hash}/dist/${path} cannot be found`);
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'max-age=300', // don't bother us for the next five minutes
      },
      body: `file ${path} does not exist`,
    };
  };
}

function staticBase(owner, repo, entry, ref, strain = 'default') {
  return `__HLX/${owner}/${repo}/${strain}/${ref}/${entry}/DIST__`;
}

function bundleAssets(entry, ref, owner, repo, strain) {
  return () => {
    if (fs.existsSync('../dist')) {
      return 'skipped';
    }
    // TODO: skip if dist exists
    const parcelopts = {
      contentHash: true,
      outDir: '../dist',
      publicUrl: staticBase(owner, repo, entry, ref, strain),
      watch: false,
      // process.env.NODE_ENV !== 'production'
      cache: true,
      cacheDir: '.cache',
      minify: true,
      target: 'browser',
      https: true,
      logLevel: 0,
      hmrPort: 0,
      // resolves to a random free port)
      sourceMaps: true,
      // minified builds yet)
      hmrHostname: '',
      detailedReport: false,
    };
    process.env.NODE_ENV = 'production';
    const bundler = new Bundler(entry, parcelopts);
    return bundler.bundle();
  };
}

function installDependencies(hash, repo, ref, pwd) {
  return () => {
    // TODO: skip if node_modules exists
    $.cd(`${hash}/${repo}-${ref}`);
    if (!fs.existsSync(`${pwd}/${hash}/${repo}-${ref}/node_modules`)) {
      return $.exec('npm install', { silent: true });
    }
    return 'skipped';
  };
}

function extractCode(hash) {
  return (buf) => {
    // TODO: skip if download directory exists
    if (!fs.existsSync(hash)) {
      return decompress(buf, hash);
    }
    return [];
  };
}

function loadCode(owner, repo, ref, entry) {
  const url = `https://codeload.github.com/${owner}/${repo}/zip/${ref}`;
  const pwd = process.cwd();
  const options = {
    url,
    encoding: null,
  };
  const hash = crypto.createHash('md5').update(owner).update(repo).update(ref)
    .update(entry)
    .digest('hex');
  // console.log(url);
  const prom = fs.existsSync(`./${hash}`) ? Promise.resolve(hash) : request.get(options);
  return { prom, hash, pwd };
}

function getSha(owner, repo, name, clientid, clientsecret) {
  if (name.match(/[a-f0-9]{40}/)) {
    return name;
  }
  const apiopts = {
    url: `https://api.github.com/repos/${owner}/${repo}/commits/${name}?client_id=${clientid}&client_secret=${clientsecret}`,
    headers: {
      'User-Agent': 'Project Helix Static',
      Accept: 'application/vnd.github.VERSION.sha',
    },
    resolveWithFullResponse: true,
  };

  return request.get(apiopts).then((response) => {
    console.log(`Remaining rate limit: ${response.headers['x-ratelimit-remaining']}`);
    return response.body;
  }).catch((e) => {
    console.error(e);
    return e;
  });
}

function redirectToRef(owner, repo, ref, entry, path, strain, clientid, clientsecret) {
  return getSha(owner, repo, ref, clientid, clientsecret).then(sha => ({
    statusCode: 307,
    headers: {
      Location: `${staticBase(owner, repo, entry, sha, strain)}/${path}`,
    },
  })).catch(error);
}

function deliverPlain(owner, repo, ref, entry, root) {
  const cleanentry = (root + '/' + entry).replace(/^\//, '').replace(/[/]+/g, '');
  console.log('deliverPlain()', owner, repo, ref, cleanentry);
  const rawopts = {
    url: `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${cleanentry}`,
    headers: {
      'User-Agent': 'Project Helix Static',
    },
  };

  return request.get(rawopts).then((responsebody) => {
    const type = mime.contentType(cleanentry) || 'application/octet-stream';
    const body = getBody(type, responsebody);
    console.log(`delivering file ${cleanentry} type ${type}`);
    return {
      headers: addHeaders({
        'Content-Type': type,
        'X-Static': 'Raw/Static',
      }, ref, responsebody),
      body,
    };
  }).catch(error);
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
 * @param {string} params.clientid client id of a GitHub app
 * @param {string} params.clientsecret client secret of a GitHub app
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
  clientid,
  clientsecret,
  allow,
  deny,
  root = '',
}) {
  console.log('main()', owner, repo, ref, path, entry, strain, plain, allow, deny, root);

  if (blacklisted(path, allow, deny) || blacklisted(entry, allow, deny)) {
    return forbidden();
  }

  // the sha of the ref to deliver from
  let sha = ref;
  // the file that is being requested
  let file = path;

  if (plain) {
    return deliverPlain(owner, repo, ref, entry, root);
  }

  if (!path) {
    sha = await getSha(owner, repo, ref, clientid, clientsecret);
    file = entry;
  } else if (!ref.match(/[a-f0-9]{40}/)) {
    return redirectToRef(owner, repo, ref, entry, path, strain, clientid, clientsecret);
  }

  const { prom, hash, pwd } = loadCode(owner, repo, sha, entry);

  return prom
    .then(extractCode(hash))
    .then(installDependencies(hash, repo, sha, pwd))
    .then(bundleAssets(entry, sha, owner, repo, strain))
    .then(deliverStatic(pwd, hash, file, ref, repo))
    .catch(e => error(e));
}

module.exports = {
  main, error, addHeaders, isBinary, staticBase, blacklisted,
};
