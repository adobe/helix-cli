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
import { fetch } from '../fetch-utils.js';

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
    const res = await fetch(uri, {
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
   * @returns {string} the modified body
   */
  injectLiveReloadScript(body) {
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
      body = `${body.substring(0, index)}<script src="/__internal__/livereload.js"></script>${body.substring(index)}`;
    }
    return body;
  },

  /**
   * Computes a path to store a cache objet
   * @param {string} pathname the url pathname
   * @param {string} qs the url query string
   * @param {string} directory a local directory path
   * @returns {string} the computed path
   */
  computePathForCache(pathname, qs, directory) {
    let fileName = pathname;
    if (qs) {
      const index = fileName.lastIndexOf('.');
      if (index > -1) {
        // inject qs as b64 in filename before extension
        fileName = `${fileName.substring(0, index)}.${qs}${fileName.substring(index)}`;
      } else {
        fileName = `${fileName}.${qs}`;
      }
    }
    const filePath = path.join(directory, fileName);
    return filePath;
  },

  /**
   * Writes a partial request object to a local file
   * @param {string} pathname the url pathname
   * @param {string} qs the url query string
   * @param {string} directory a local directory path
   * @param {Object} ret the partial request object ({ body, headers, status })
   * @param {Logger} logger a logger
   */
  async writeToCache(pathname, qs, directory, { body, headers, status }, logger) {
    try {
      const filePath = utils.computePathForCache(pathname, qs, directory);
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
   * @param {string} pathname the url pathname
   * @param {string} qs the url query string
   * @param {string} directory a local directory path
   * @param {Logger} logger a logger
   * @returns {Object} the partial request object ({ body, headers, status }). Null if not found.
   */
  async getFromCache(pathname, qs, directory, logger) {
    try {
      const filePath = utils.computePathForCache(pathname, qs, directory);
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
    ctx.log.debug(`Proxy ${req.method} request to ${url}`);

    if (opts.cacheDirectory) {
      const cached = await utils.getFromCache(
        ctx.path,
        ctx.queryString,
        opts.cacheDirectory,
        ctx.log,
      );
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
      ...req.headers,
      ...(opts.headers || {}),
    };
    delete headers.cookie;
    delete headers.connection;
    delete headers.host;
    let proxyUrl = url;
    if (ctx.queryString) {
      proxyUrl = `${url}${ctx.queryString}`;
    }
    const ret = await fetch(proxyUrl, {
      method: req.method,
      headers,
      cache: 'no-store',
      body,
      redirect: 'manual',
    });
    const contentType = ret.headers.get('content-type') || 'text/plain';
    const level = utils.status2level(ret.status, true);
    ctx.log[level](`Proxy ${req.method} request to ${url}: ${ret.status} (${contentType})`);

    const isHTML = ret.status === 200 && contentType.indexOf('text/html') === 0;
    const injectLR = isHTML && opts.injectLiveReload;
    const replaceHead = isHTML && opts.headHtml && opts.headHtml.isModified;
    const doIndex = isHTML && opts.indexer && url.indexOf('.plain.html') < 0;

    // because fetch decodes the response, we need to reset content encoding and length
    const respHeaders = ret.headers.plain();
    delete respHeaders['content-encoding'];
    delete respHeaders['content-length'];
    respHeaders['access-control-allow-origin'] = '*';
    respHeaders.via = `${ret.httpVersion ?? '1.0'} ${new URL(url).hostname}`;

    if (ctx.log.level === 'silly' || injectLR || replaceHead || doIndex) {
      let respBody;
      let textBody;
      if (contentType.startsWith('text/')) {
        textBody = await ret.text();
      } else {
        respBody = await ret.buffer();
      }
      const lines = ['----------------------------->'];
      if (ctx.log.level === 'silly') {
        lines.push(`${req.method} ${url}`);
        Object.entries(headers).forEach(([name, value]) => {
          lines.push(`${name}: ${value}`);
        });
        lines.push('');
        lines.push('<-----------------------------');
        lines.push('');
        lines.push(`http/${ret.httpVersion} ${ret.status} ${ret.statusText}`);
        Object.entries(ret.headers.plain()).forEach(([name, value]) => {
          lines.push(`${name}: ${value}`);
        });
        lines.push('');
        if (respBody) {
          lines.push(`<binary ${respBody.length} bytes>`);
        } else {
          lines.push(textBody);
        }
        ctx.log.trace(lines.join('\n'));
      }
      if (replaceHead) {
        textBody = opts.headHtml.replace(textBody);
      }
      if (injectLR) {
        textBody = utils.injectLiveReloadScript(textBody);
      }
      if (doIndex) {
        opts.indexer.onData(url, {
          body: textBody,
          headers: respHeaders,
        });
      }

      if (opts.cacheDirectory) {
        await utils.writeToCache(
          ctx.path,
          ctx.queryString,
          opts.cacheDirectory,
          {
            body: respBody || textBody,
            headers: respHeaders,
            status: ret.status,
          },
          ctx.log,
        );
      }

      res
        .status(ret.status)
        .set(respHeaders)
        .send(respBody || textBody);
      return;
    }

    if (opts.cacheDirectory) {
      const buffer = await ret.buffer();
      await utils.writeToCache(
        ctx.path,
        ctx.queryString,
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
   * @return {Promise} that resolves `true` if the port is in use.
   */
  checkPortInUse(port) {
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

      socket.connect(port, () => {
        resolve(true);
        cleanUp();
      });
    });
  },

  /**
   * Creates a proxy url for the proxy mode. it sanitizes the original request url by removing
   * search params if needed.
   * @param {string} reqUrl original request url
   * @param {string} base base url
   * @returns {string}
   */
  makeProxyURL(reqUrl, base) {
    const url = new URL(reqUrl, base);
    // remove search params if needed
    if (url.search
      && reqUrl.indexOf('/hlx_') < 0
      && reqUrl.indexOf('/media_') < 0
      && reqUrl.indexOf('.json') < 0
      && reqUrl.indexOf('/cgi-bin/') < 0
    ) {
      url.search = '';
    }
    return url.href;
  },
};

export default Object.freeze(utils);
