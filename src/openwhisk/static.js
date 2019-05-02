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
const request = require('request-promise-native');
const crypto = require('crypto');
const mime = require('mime-types');
const postcss = require('postcss');
const postcssurl = require('postcss-url');
const parser = require('postcss-value-parser');
const babel = require('@babel/core');
const ohash = require('object-hash');

const { space } = postcss.list;
const uri = require('uri-js');
/* eslint-disable no-console */

// one megabyte openwhisk limit + 20% Base64 inflation + safety padding
const REDIRECT_LIMIT = 750000;

function errorCode(code) {
  switch (code) {
    case 400:
      return 404;
    default:
      return code;
  }
}

function error(message, code = 500) {
  // treat
  const statusCode = errorCode(code);
  console.error('delivering error', message, code);
  return {
    statusCode,
    headers: {
      'Content-Type': 'text/html',
      'X-Static': 'Raw/Static',
    },
    body: `Error ${code}: ${message}`,
  };
}


function isCSS(type) {
  return type === 'text/css';
}

function isJavaScript(type) {
  return type.match(/(text|application)\/(x-)?(javascript|ecmascript)/);
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
    if (headers['Content-Type'] && (
      isCSS(headers['Content-Type'])
      || isJavaScript(headers['Content-Type'])
    ) && content.toString().match(/<esi:include/)) {
      cacheheaders['X-ESI'] = true;
    }
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
    return !!type.match(/svg/); // openwshisk treats svg as binary
  }
  return true;
}

function rewriteCSS(css, base = '') {
  function rewriteImports(tree) {
    tree.walkAtRules('import', (rule) => {
      if (rule.name === 'import') {
        const [url, queries] = space(rule.params);
        const parsedurl = parser(url);
        if (parsedurl.nodes
          && parsedurl.nodes.length === 1
          && parsedurl.nodes[0].value === 'url'
          && parsedurl.nodes[0].nodes
          && parsedurl.nodes[0].nodes.length === 1
          && parsedurl.nodes[0].nodes[0].type === 'string'
          && typeof parsedurl.nodes[0].nodes[0].value === 'string'
          && typeof parsedurl.nodes[0].nodes[0].quote === 'string') {
          const importuri = uri.parse(parsedurl.nodes[0].nodes[0].value);
          const { quote } = parsedurl.nodes[0].nodes[0];
          if (importuri.reference === 'relative' && !importuri.query) {
            rule.replaceWith(postcss.atRule({
              name: 'import',
              params: `url(${quote}<esi:include src="${importuri.path}.url"/><esi:remove>${importuri.path}</esi:remove>${quote}) ${queries}`,
            }));
          }
        } else if (parsedurl.nodes
          && parsedurl.nodes[0].type === 'string'
          && typeof parsedurl.nodes[0].value === 'string'
          && typeof parsedurl.nodes[0].quote === 'string') {
          const importuri = uri.parse(parsedurl.nodes[0].value);
          const { quote } = parsedurl.nodes[0];
          if (importuri.reference === 'relative' && !importuri.query) {
            rule.replaceWith(postcss.atRule({
              name: 'import',
              params: `${quote}<esi:include src="${uri.resolve(base, importuri.path)}.url"/><esi:remove>${importuri.path}</esi:remove>${quote} ${queries}`,
            }));
          }
        }
      }
    });
    return tree;
  }


  const processor = postcss()
    .use(rewriteImports)
    .use(postcssurl({
      url: (asset) => {
        // TODO pass in request URL and make it absolute.
        if (asset.search === '' && asset.absolutePath !== '.' && asset.relativePath !== '.') {
          return `<esi:include src="${uri.resolve(base, asset.relativePath)}.url"/><esi:remove>${asset.relativePath}</esi:remove>`;
        }
        return asset.url;
      },
    }));
  return processor.process(css, { from: undefined }).then(result => result.css);
}

function rewriteJavaScript(javascript, base = '') {
  const importmap = {};

  function rewriteJSImports(bab) {
    const t = bab.types;
    return {
      visitor: {
        ImportDeclaration(path) {
          if (path
            && path.node
            && path.node.source
            && path.node.source.value
            && !importmap[path.node.source.value]) {
            const srcuri = uri.parse(path.node.source.value);
            if (srcuri.reference === 'relative' && !srcuri.query) {
              const { specifiers } = path.node;
              // console.log(srcuri);
              const h = ohash(srcuri.path);
              importmap[h] = `<esi:include src="${uri.resolve(base, srcuri.path)}.url"/><esi:remove>${path.node.source.value}</esi:remove>`;
              path.replaceWith(t.importDeclaration(specifiers, t.stringLiteral(h)));
            }
          }
          return false;
        },
      },
    };
  }

  try {
    const transformed = babel.transformSync(javascript,
      { plugins: [rewriteJSImports], retainLines: true });

    return Object.keys(importmap)
      .reduce((src, key) => src.replace(key, importmap[key]), transformed.code);
  } catch (e) {
    return javascript;
  }
}

function isJSON(type) {
  return !!type.match(/json/);
}

function getBody(type, responsebody, esi = false, entry) {
  if (isBinary(type)) {
    return Buffer.from(responsebody).toString('base64');
  }
  if (isJSON(type)) {
    return JSON.parse(responsebody);
  }
  if (esi && isCSS(type)) {
    return rewriteCSS(responsebody.toString(), entry);
  }
  if (esi && isJavaScript(type)) {
    return rewriteJavaScript(responsebody.toString(), entry);
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

function deliverPlain(owner, repo, ref, entry, root, esi = false) {
  const cleanentry = (`${root}/${entry}`).replace(/^\//, '').replace(/[/]+/g, '/');
  console.log('deliverPlain()', owner, repo, ref, cleanentry);
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${cleanentry}`;
  console.log(url);
  const rawopts = {
    url,
    headers: {
      'User-Agent': 'Project Helix Static',
    },
    resolveWithFullResponse: true,
    encoding: null,
  };

  return request.get(rawopts).then(async (response) => {
    const type = mime.lookup(cleanentry) || 'application/octet-stream';
    const size = parseInt(response.headers['content-length'], 10);
    console.log('size', size);
    if (size < REDIRECT_LIMIT) {
      const body = await getBody(type, response.body, esi, entry);
      console.log(`delivering file ${cleanentry} type ${type} binary: ${isBinary(type)}`);
      return {
        statusCode: 200,
        headers: addHeaders({
          'Content-Type': type,
          'X-Static': 'Raw/Static',
          'X-ESI': esi ? 'enabled' : undefined,
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
    if (esi) {
      // the ESI failed, so we simply fall back to the original URL
      // the browser will fetch it again, so let's cache the 404
      // for five minutes, in order to prevent the static function
      // from being called too often
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 's-max-age=300',
        },
        body: entry,
      };
    }
    return error(rqerror.response.body.toString(), rqerror.statusCode);
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
 * @param {boolean} params.esi replace relative URL references in JS and CSS with ESI references
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
  esi = false,
}) {
  console.log('main()', owner, repo, ref, path, entry, strain, plain, allow, deny, root);

  const file = uri.normalize(entry);
  console.log(file);
  if (blacklisted(file, allow, deny)) {
    return forbidden();
  }

  if (plain) {
    return deliverPlain(owner, repo, ref, file, root, esi);
  }

  return forbidden();
}

module.exports = {
  main, error, addHeaders, isBinary, staticBase, blacklisted, getBody,
};
