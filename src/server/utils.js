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
import fs from 'fs-extra';
import crypto from 'crypto';
import path from 'path';
import { Socket } from 'net';
import { PassThrough } from 'stream';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import cookie from 'cookie';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import { getFetch } from '../fetch-utils.js';

// Load console interceptor script at startup
// eslint-disable-next-line no-underscore-dangle
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONSOLE_INTERCEPTOR = readFileSync(
  path.join(__dirname, '../../packages/browser-injectables/src/console-interceptor.js'),
  'utf-8',
);

const utils = {
  status2level(status, debug3xx) {
    if (status < 300) {
      return 'debug';
    }
    if (status < 400) {
      return debug3xx ? 'debug' : 'info';
    }
    if (status < 500) {
      return 'warn';
    }
    return 'error';
  },

  /**
   * Checks if the file addressed by the given filename exists and is a regular file.
   * @param {String} filename Path to file
   * @returns {Promise} Returns promise that resolves with the filename or rejects if is not a file.
   */
  async isFile(filename) {
    const stats = await fs.stat(filename);
    if (!stats.isFile()) {
      throw Error(`no regular file: ${filename}`);
    }
    return filename;
  },

  /**
   * Fetches content from the given uri
   * @param {String} uri URL to fetch
   * @param {RequestContext} ctx the context
   * @param {object} auth authentication object ({@see https://github.com/request/request#http-authentication})
   * @returns {Buffer} The requested content or NULL if not exists.
   */
  async fetch(ctx, uri, auth) {
    const headers = {
      'X-Request-Id': ctx.requestId,
    };
    if (auth) {
      headers.authorization = `Bearer ${auth}`;
    }
    const res = await getFetch(ctx.config.allowInsecure)(uri, {
      cache: 'no-store',
      headers,
    });
    const body = await res.buffer();
    if (!res.ok) {
      const level = utils.status2level(res.status);
      ctx.log[level](`resource at ${uri} does not exist. got ${res.status} from server`);
      return null;
    }
    return body;
  },

  /**
   * Injects the live-reload script
   * @param {string} body the html body
   * @param {HelixServer} server the proxy server
   * @returns {string} the modified body
   */
  injectLiveReloadScript(body, server) {
    let match = body.match(/<\/head>/i);
    if (!match) {
      match = body.match(/<\/body>/i);
    }
    if (!match) {
      match = body.match(/<\/html>/i);
    }
    // don't inject if no html found at all.
    if (match) {
      const { index } = match;
      // eslint-disable-next-line no-param-reassign
      const nonceMatch = body.match(/nonce="([a-zA-Z0-9+/=]+)"/);
      const nonce = nonceMatch ? ` nonce="${nonceMatch[1]}"` : '';
      let newbody = body.substring(0, index);
      if (process.env.CODESPACES === 'true') {
        newbody += `<script${nonce}>
window.LiveReloadOptions = { 
  host: new URL(location.href).hostname.replace(/-[0-9]+\\.preview\\.app\\.github\\.dev/, '-35729.preview.app.github.dev'), 
  port: 443,
  https: true,
};
</script>`;
      } else {
        newbody += `<script${nonce}>window.LiveReloadOptions={port:${server.port},host:location.hostname,https:${server.scheme === 'https'}};</script>`;
      }
      newbody += `<script${nonce} src="/__internal__/livereload.js"></script>`;

      // Inject console interceptor if browser log forwarding is enabled
      if (server.forwardBrowserLogs) {
        newbody += `<script${nonce}>${CONSOLE_INTERCEPTOR}</script>`;
      }

      newbody += body.substring(index);
      return newbody;
    }
    return body;
  },

  /**
   * Injects meta tags
   * @param {string} body the html body
   * @param {object} props meta properties
   * @returns {string} the modified body
   */
  injectMeta(body, props) {
    const match = body.match(/<\/head>/i);
    if (!match) {
      return body;
    }
    const text = Object.entries(props).map(([property, content]) => {
      const c = content
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');
      return `<meta property="${property}" content="${c}">`;
    }).join('\n');

    const { index } = match;
    return `${body.substring(0, index)}${text}${body.substring(index)}`;
  },

  /**
   * Computes a path to store a cache objet from a url
   * @param {string} url the url
   * @param {string} directory a local directory path
   * @returns {string} the computed path
   */
  computePathForCache(url, directory) {
    const u = new URL(url);
    const { pathname, search } = u;
    let fileName = pathname.substring(1);
    if (fileName.endsWith('/') || fileName === '') {
      fileName += 'index.html';
    }
    if (search) {
      let qs = search.substring(1); // remove leading '?'
      if (fileName.length + qs.length > 255) {
        // try with query string as md5
        qs = crypto.createHash('md5').update(qs).digest('hex');
      }
      if (fileName.length + qs.length <= 255) {
        const index = fileName.lastIndexOf('.');
        if (index > -1) {
          // inject qs before extension
          fileName = `${fileName.substring(0, index)}!${qs}${fileName.substring(index)}`;
        } else {
          fileName = `${fileName}!${qs}`;
        }
      } else {
        // still too long, use md5 as filename
        fileName = crypto.createHash('md5').update(`${fileName}${search.substring(1)}`).digest('hex');
      }
    }
    return path.resolve(directory, fileName);
  },

  /**
   * Writes a partial request object to a local file
   * @param {string} url the request url
   * @param {string} directory a local directory path
   * @param {Object} ret the partial request object ({ body, headers, status })
   * @param {Logger} logger a logger
   */
  async writeToCache(url, directory, { body, headers, status }, logger) {
    try {
      const filePath = utils.computePathForCache(url, directory);
      const parent = path.dirname(filePath);
      logger.debug(`Not in cache, saving: ${filePath}`);
      await fs.ensureDir(parent);
      await fs.writeFile(filePath, body);
      await fs.writeJSON(`${filePath}.json`, { headers, status });
    } catch (error) {
      logger.error(error);
    }
  },

  /**
   * Returns a partial request object ({ body, headers, status }) from a local file
   * @param {string} url the request url
   * @param {string} directory a local directory path
   * @param {Logger} logger a logger
   * @returns {Object} the partial request object ({ body, headers, status }). Null if not found.
   */
  async getFromCache(url, directory, logger) {
    try {
      const filePath = utils.computePathForCache(url, directory);
      logger.debug(`Trying from cache first: ${filePath}`);

      if (await fs.pathExists(filePath)) {
        const body = await fs.readFile(filePath);
        const { headers, status } = await fs.readJSON(`${filePath}.json`);
        return { body, headers, status };
      }
    } catch (error) {
      logger.error(error);
    }
    return null;
  },

  /**
   * Fetches the content from the url  and streams it back to the response.
   * @param {RequestContext} ctx Context
   * @param {string} url The url to fetch from
   * @param {Request} req The original express request
   * @param {Response} res The express response
   * @param {object} opts additional request options
   * @return {Promise} A promise that resolves when the stream is done.
   */
  async proxyRequest(ctx, url, req, res, opts = {}) {
    const { id } = ctx;
    ctx.log.debug(`[${id}] Proxy ${req.method} request to ${url}`);

    if (opts.cacheDirectory) {
      const cached = await utils.getFromCache(url, opts.cacheDirectory, ctx.log);
      if (cached) {
        res
          .status(cached.status)
          .set(cached.headers)
          .send(cached.body);
        return;
      }
    }

    let body;
    // GET and HEAD requests can't have a body
    if (!['GET', 'HEAD'].includes(req.method)) {
      body = new PassThrough();
      req.pipe(body);
    }
    const stream = new PassThrough();
    req.pipe(stream);
    const headers = {
      'x-forwarded-host': `localhost:${ctx.config.server.port}`,
      'x-forwarded-scheme': 'http',
      ...req.headers,
      ...(opts.headers || {}),
    };

    // hlx 5 site auth
    if (opts.siteToken) {
      headers.authorization = `token ${opts.siteToken}`;
    }

    if (!opts.cookies) {
      // only pass through hlx-auth-token cookie
      const cookies = cookie.parse(headers.cookie || '');
      delete headers.cookie;
      const hlxAuthToken = cookies['hlx-auth-token'];
      if (hlxAuthToken) {
        headers.cookie = new URLSearchParams({
          'hlx-auth-token': hlxAuthToken,
        }).toString();
      }
    }

    delete headers.connection;
    delete headers['proxy-connection'];
    delete headers.host;
    const ret = await getFetch(ctx.config.allowInsecure)(url, {
      method: req.method,
      headers,
      cache: 'no-store',
      body,
      redirect: 'manual',
    });
    const contentType = ret.headers.get('content-type') || 'text/plain';
    const level = utils.status2level(ret.status, true);
    ctx.log[level](`[${id}] Proxy ${req.method} request to ${url}: ${ret.status} (${contentType})`);

    const respHeaders = Object.fromEntries(ret.headers.entries());
    // multiple Set-Cookie headers need special handling
    // https://www.npmjs.com/package/node-fetch#extract-set-cookie-header
    const setCookieValues = ret.headers.raw()['set-cookie'];
    if (setCookieValues?.length) {
      respHeaders['set-cookie'] = setCookieValues;
    }
    delete respHeaders['content-encoding'];
    delete respHeaders['content-length'];
    delete respHeaders['x-frame-options'];
    delete respHeaders['content-security-policy'];
    delete respHeaders.connection;
    respHeaders['access-control-allow-origin'] = '*';
    respHeaders.via = `${ret.httpVersion ?? '1.0'} ${new URL(url).hostname}`;

    if (ret.status === 404 && contentType.indexOf('text/html') === 0 && opts.file404html) {
      ctx.log.debug(`[${id}] serve local 404.html ${opts.file404html}`);
      let textBody = await fs.readFile(opts.file404html, 'utf-8');
      if (opts.injectLiveReload) {
        textBody = utils.injectLiveReloadScript(textBody, ctx.config.server);
      }
      res
        .status(404)
        .set(respHeaders)
        .send(textBody);
      return;
    }

    const isHTML = ret.status === 200 && contentType.indexOf('text/html') === 0;
    const isHTMLWithAuthError = (ret.status === 401 || ret.status === 403) && contentType.indexOf('text/html') === 0;
    const livereload = isHTML && opts.injectLiveReload;
    const replaceHead = isHTML && opts.headHtml;
    const doIndex = isHTML && opts.indexer && url.indexOf('.plain.html') < 0;

    if (ctx.log.level === 'silly') {
      ctx.log.trace(`[${id}] -----------------------------`);
      ctx.log.trace(`[${id}] < http/${ret.httpVersion} ${ret.status} ${ret.statusText}`);
      Object.entries(ret.headers.raw()).forEach(([name, value]) => {
        ctx.log.trace(`[${id}] < ${name}: ${value}`);
      });
    }

    if (isHTML) {
      let textBody = await ret.text();
      if (ctx.log.level === 'silly') {
        ctx.log.trace(textBody);
        ctx.log.trace(`[${id}] <<<--------------------------`);
      }
      if (replaceHead) {
        await opts.headHtml.setCookie(req.headers.cookie);
        textBody = await opts.headHtml.replace(textBody);
      }
      if (livereload) {
        textBody = utils.injectLiveReloadScript(textBody, ctx.config.server);
      }
      textBody = utils.injectMeta(textBody, {
        'hlx:proxyUrl': url,
      });

      if (doIndex) {
        opts.indexer.onData(url, {
          body: textBody,
          headers: respHeaders,
        });
      }

      if (opts.cacheDirectory) {
        await utils.writeToCache(
          url,
          opts.cacheDirectory,
          {
            body: textBody,
            headers: respHeaders,
            status: ret.status,
          },
          ctx.log,
        );
      }

      res
        .set(respHeaders)
        .status(ret.status)
        .send(textBody);
      return;
    }
    if (isHTMLWithAuthError) {
      // Handle HTML responses with 401/403 status - inject meta tag
      let textBody = await ret.text();
      if (ctx.log.level === 'silly') {
        ctx.log.trace(textBody);
        ctx.log.trace(`[${id}] <<<--------------------------`);
      }
      textBody = utils.injectMeta(textBody, {
        'hlx:proxyUrl': url,
      });

      res
        .set(respHeaders)
        .status(ret.status)
        .send(textBody);
      return;
    }

    if (ret.status === 401 || ret.status === 403) {
      const reqHeaders = req.headers;
      if (opts.autoLogin && opts.loginPath
        && reqHeaders?.['sec-fetch-dest'] === 'document'
        && reqHeaders?.['sec-fetch-mode'] === 'navigate'
      ) {
        // try to automatically login
        res.set('location', opts.loginPath).status(302).send();
        return;
      }

      // Transform plain text 401/403 responses into Chrome-compatible HTML
      // This allows the sidekick to recognize the error page and enable login
      const statusText = ret.status === 401 ? '401 Unauthorized' : '403 Forbidden';
      const escapedUrl = url
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');

      const textBody = `<html><head><meta name="color-scheme" content="light dark"><meta property="hlx:proxyUrl" content="${escapedUrl}"></head><body><pre style="word-wrap: break-word; white-space: pre-wrap;">${statusText}</pre></body></html>`;

      respHeaders['content-type'] = 'text/html';
      res
        .set(respHeaders)
        .status(ret.status)
        .send(textBody);
      return;
    }

    if (ctx.log.level === 'silly') {
      ctx.log.trace(`[${id}] <<<--------------------------`);
    }

    if (opts.cacheDirectory) {
      const buffer = await ret.buffer();
      await utils.writeToCache(
        url,
        opts.cacheDirectory,
        {
          body: buffer,
          headers: respHeaders,
          status: ret.status,
        },
        ctx.log,
      );
      res
        .status(ret.status)
        .set(respHeaders)
        .send(buffer);
      return;
    }

    res
      .status(ret.status)
      .set(respHeaders);
    ret.body.pipe(res);
  },

  /**
   * Generates a random string of the given `length` consisting of alpha numerical characters.
   * if `hex` is {@code true}, the string will only consist of hexadecimal digits.
   * @param {number}length length of the string.
   * @param {boolean} hex returns a hex string if {@code true}
   * @returns {String} a random string.
   */
  randomChars(length, hex = false) {
    if (length === 0) {
      return '';
    }
    if (hex) {
      return crypto.randomBytes(Math.round(length / 2)).toString('hex').substring(0, length);
    }
    const str = crypto.randomBytes(length).toString('base64');
    return str.substring(0, length);
  },

  /**
   * Checks if the given port is already in use on any addr. This is used to prevent starting a
   * server on the same port with an existing socket bound to 0.0.0.0 and SO_REUSEADDR.
   * @param port
   @param addr   * @return {Promise} that resolves `true` if the port is in use.
   */
  checkPortInUse(port, addr = '0.0.0.0') {
    return new Promise((resolve, reject) => {
      let socket;

      const cleanUp = () => {
        if (socket) {
          socket.removeAllListeners('connect');
          socket.removeAllListeners('error');
          socket.end();
          socket.destroy();
          socket.unref();
          socket = null;
        }
      };

      socket = new Socket();
      socket.once('error', (err) => {
        if (err.code !== 'ECONNREFUSED') {
          reject(err);
        } else {
          resolve(false);
        }
        cleanUp();
      });

      socket.connect(port, addr, () => {
        resolve(true);
        cleanUp();
      });
    });
  },

  /**
   * Rewrites all absolute urls to the proxy host with relative ones.
   * @param {Buffer} html
   * @param {string} host
   * @returns {Buffer}
   */
  rewriteUrl(html, host) {
    const hostPattern = host.replaceAll('.', '\\.');
    let text = html.toString('utf-8');
    const re = new RegExp(`(src|href)\\s*=\\s*(["'])${hostPattern}(/.*?)?(['"])`, 'gm');
    text = text.replaceAll(re, (match, arg, q1, value, q2) => (`${arg}=${q1}${value || '/'}${q2}`));
    return Buffer.from(text, 'utf-8');
  },

  /**
   * Escapes HTML entities for use in attributes
   * @param {string} text text to escape
   * @returns {string} escaped text
   */
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Extracts text content from HTML using proper HTML parsing
   * @param {string} html HTML content to extract text from
   * @returns {string} plain text content
   */
  extractTextFromHtml(html) {
    // Helper to recursively extract text from AST nodes
    function extractText(node) {
      if (node.type === 'text') {
        return node.value;
      }
      if (node.children) {
        return node.children.map(extractText).join('');
      }
      return '';
    }

    try {
      const ast = unified()
        .use(rehypeParse, { fragment: true })
        .parse(html);
      return extractText(ast).trim();
    } catch (e) {
      // If parsing fails, return empty string to avoid XSS vulnerabilities
      return '';
    }
  },

  /**
   * Validates that a file path is within a base directory (security check)
   * @param {string} filePath absolute file path to validate
   * @param {string} baseDirectory base directory path
   * @returns {boolean} true if path is safe, false if it tries to escape base directory
   */
  validatePathSecurity(filePath, baseDirectory) {
    const resolvedBaseDir = path.resolve(baseDirectory);
    const relPath = path.relative(resolvedBaseDir, filePath);
    return !relPath.startsWith('..');
  },

  /**
   * Extracts metadata block from plain HTML content
   * @param {string} html HTML content with potential metadata block
   * @returns {{content: string, metadata: object}} cleaned content and metadata object
   */
  extractMetadataBlock(html) {
    // The metadata block structure is:
    // <div>
    //   <div class="metadata">
    //     <div><div>key</div><div>value</div></div>
    //   </div>
    // </div>

    // Find the outer div containing the metadata div
    const outerDivRegex = /<div>\s*<div class="metadata">/;
    const outerMatch = html.match(outerDivRegex);

    if (!outerMatch) {
      return { content: html, metadata: {} };
    }

    // Find the matching closing </div></div> by counting nested divs
    // Start after <div><div class="metadata">
    const startIndex = outerMatch.index + outerMatch[0].length;
    let depth = 2; // Already inside two divs
    let endIndex = startIndex;
    let closingDivCount = 0;

    for (let i = startIndex; i < html.length && closingDivCount < 2; i += 1) {
      if (html.substr(i, 5) === '<div>') {
        depth += 1;
      } else if (html.substr(i, 6) === '</div>') {
        depth -= 1;
        if (depth < 2) {
          closingDivCount += 1;
          if (closingDivCount === 2) {
            endIndex = i + 6; // Include the last </div>
          }
        }
      }
    }

    if (closingDivCount !== 2) {
      // Malformed HTML, return as-is
      return { content: html, metadata: {} };
    }

    // Extract the metadata block content and remove entire outer div from HTML
    const fullMetadataBlock = html.substring(outerMatch.index, endIndex);
    const metadataBlock = html.substring(startIndex, endIndex - 12); // -12 for </div></div>
    const cleanedContent = html.replace(fullMetadataBlock, '').trim();

    // Parse metadata block to extract key-value pairs
    const pairRegex = /<div>\s*<div>([^<]+)<\/div>\s*<div>([\s\S]*?)<\/div>\s*<\/div>/g;
    const metadata = {};
    let pairMatch;

    // eslint-disable-next-line no-cond-assign
    while ((pairMatch = pairRegex.exec(metadataBlock)) !== null) {
      const key = pairMatch[1].trim();
      let value = pairMatch[2].trim();

      // Handle <img> tags - extract src
      const imgMatch = value.match(/<img[^>]+src="([^"]+)"/);
      if (imgMatch) {
        [, value] = imgMatch;
      } else {
        // Use proper HTML parsing to extract text content
        value = utils.extractTextFromHtml(value);
      }

      metadata[key] = value;
    }

    return { content: cleanedContent, metadata };
  },

  /**
   * Extracts default metadata values from HTML content
   * @param {string} content HTML content to extract defaults from
   * @returns {object} default metadata values
   */
  extractDefaultMetadata(content) {
    const defaults = {};

    // Extract title from first H1
    const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
      // Use proper HTML parsing to extract text
      defaults.title = utils.extractTextFromHtml(h1Match[1]);
    }

    // Extract description from first paragraph with 10+ words
    const pMatch = content.match(/<p[^>]*>(.*?)<\/p>/i);
    if (pMatch) {
      // Use proper HTML parsing to extract text
      const text = utils.extractTextFromHtml(pMatch[1]);
      const wordCount = text.split(/\s+/).length;
      if (wordCount >= 10) {
        defaults.description = text;
      }
    }

    // Extract image from first img tag
    const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i);
    if (imgMatch) {
      [, defaults.image] = imgMatch;
    }

    return defaults;
  },

  /**
   * Generates meta tags from metadata object with AEM.live special property support
   * @param {object} metadata key-value pairs of metadata
   * @param {object} defaults default values extracted from content
   * @returns {string} HTML string of meta tags
   */
  generateMetaTags(metadata, defaults = {}) {
    // Handle title:suffix special property
    let title = metadata.title || defaults.title || '';
    const titleSuffix = metadata['title:suffix'];
    if (titleSuffix && title) {
      title = `${title} ${titleSuffix}`;
    }

    // Apply defaults for missing values
    const description = metadata.description || defaults.description || '';
    const image = metadata.image || defaults.image || '/default-meta-image.png';

    // Build final metadata object with computed values
    const finalMetadata = { ...metadata };
    if (title) finalMetadata.title = title;
    if (description) finalMetadata.description = description;
    if (image) finalMetadata.image = image;

    // Remove special properties that shouldn't become meta tags
    delete finalMetadata['title:suffix'];

    // Generate meta tags (both standard and OG format)
    const ogFields = ['title', 'description', 'image', 'url'];
    let metaTags = '';

    // Add <title> tag if title exists
    if (title) {
      metaTags += `<title>${utils.escapeHtml(title)}</title>`;
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(finalMetadata)) {
      // Skip empty values
      if (!value) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // Handle 'tags' property specially - create article:tag for each
      if (key === 'tags') {
        // Split by comma or newline
        const tagList = value.split(/[,\n]/).map((t) => t.trim()).filter((t) => t);
        // eslint-disable-next-line no-restricted-syntax
        for (const tag of tagList) {
          metaTags += `<meta property="article:tag" content="${utils.escapeHtml(tag)}">`;
        }
        // Don't create standard name= tag for 'tags'
      } else if (key === 'canonical') {
        // Handle canonical specially
        metaTags += `<link rel="canonical" href="${utils.escapeHtml(value)}">`;
        metaTags += `<meta property="og:url" content="${utils.escapeHtml(value)}">`;
        metaTags += `<meta name="twitter:url" content="${utils.escapeHtml(value)}">`;
        // Don't create standard name= tag
      } else {
        // Standard meta tag
        metaTags += `<meta name="${key}" content="${utils.escapeHtml(value)}">`;

        // Open Graph meta tag for common fields
        if (ogFields.includes(key.toLowerCase())) {
          metaTags += `<meta property="og:${key}" content="${utils.escapeHtml(value)}">`;
          // Add twitter card tags for common fields
          metaTags += `<meta name="twitter:${key}" content="${utils.escapeHtml(value)}">`;
        }
      }
    }

    return metaTags;
  },

  /**
   * Wraps plain HTML content in complete HTML structure
   * @param {string} content plain HTML content
   * @param {string} headHtml head.html content
   * @param {string} metaTags generated meta tags
   * @returns {string} complete HTML document
   */
  wrapPlainHtml(content, headHtml, metaTags) {
    const fullHead = headHtml + metaTags;
    return `<html><head>${fullHead}</head><body><header></header><main>${content}</main><footer></footer></body></html>`;
  },
};

export default Object.freeze(utils);
