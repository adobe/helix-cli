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
const fs = require('fs-extra');
const request = require('request-promise');
const path = require('path');
const logger = require('./logger.js');

const utils = {

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
   * Fetches content from the given uri.
   * @param {String} uri Either filesystem path (starting with '/') or URL
   * @returns {*} The requested content or NULL if not exists.
   */
  async fetch(uri) {
    if (uri.charAt(0) === '/') {
      try {
        return await fs.readFile(uri);
      } catch (e) {
        if (e.code === 'ENOENT') {
          return null;
        }
        throw e;
      }
    }
    try {
      const response = await request({
        method: 'GET',
        uri,
        resolveWithFullResponse: true,
        encoding: null,
      });
      return response.body;
    } catch (e) {
      if (e.response && e.response.statusCode) {
        if (e.response.statusCode !== 404) {
          logger.error(`resource at ${uri} does not exist. got ${e.response.statusCode} from server`);
        }
        return null;
      }
      logger.error(`resource at ${uri} does not exist. ${e.message}`);
      return null;
    }
  },

  /**
   * Fetches static resources and stores it in the context.
   * @param {RequestContext} ctx Context
   * @return {Promise} A promise that resolves to the request context.
   */
  async fetchStatic(ctx) {
    const uris = [
      ctx.config.contentRepo.raw + ctx.path,
      path.resolve(ctx.config.webRootDir, ctx.path.substring(1)),
    ];
    for (let i = 0; i < uris.length; i += 1) {
      const uri = uris[i];
      ctx.logger.debug(`fetching static resource from ${uri}`);
      // eslint-disable-next-line no-await-in-loop
      const data = await utils.fetch(uri);
      if (data != null) {
        ctx.content = Buffer.from(data, 'utf8');
        return ctx;
      }
    }
    const error = new Error('Resource not found.');
    error.code = 404;
    throw error;
  },

};

module.exports = Object.freeze(utils);
