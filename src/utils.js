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
const util = require('util');
const path = require('path');
const logger = require('./logger.js');

const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);
const request = require('request-promise');

const { converter } = require('@adobe/md2json');

const utils = {

  /**
   * Checks if the file addressed by the given filename exists and is a regular file.
   * @param {String} filename Path to file
   * @returns {Promise} Returns promise that resolves with the filename or rejects if is not a file.
   */
  isFile(filename) {
    return stat(filename)
      .then((stats) => {
        if (!stats.isFile()) {
          logger.debug('resolved path no regular file: %j', stats);
          return Promise.reject(new Error('no regular file'));
        }
        return filename;
      });
  },

  /**
   * Fetches content from the given uri.
   * @param {String} uri Either filesystem path (starting with '/') or URL
   * @returns {*} The requested content
   */
  fetch(uri) {
    logger.debug(`fetching content from ${uri}`);
    if (uri.charAt(0) === '/') {
      return readFile(uri);
    }
    return request({
      uri,
      // only solution found to proxy images
      encoding: null,
    });
  },

  /**
   * Fetches the content and stores it in the context.
   * @param {RequestContext} ctx Context
   * @return {Promise} A promise that resolves to the request context.
   */
  fetchContent(ctx) {
    const uri = ctx.config.contentRepo.raw + ctx.resourcePath + (ctx.extension === 'html' ? '.md' : `.${ctx.extension}`);

    return utils.fetch(uri).then((data) => {
      ctx.content = Buffer.from(data, 'utf8');
      return ctx;
    });
  },

  /**
   * Converts the markdown content into JSON and stores it in the context.
   * @param {RequestContext} ctx Context
   * @return {Promise} A promise that resolves to the request context.
   */
  convertContent(ctx) {
    return converter.convert(ctx.content).then((json) => {
      ctx.resource = json;
      return ctx;
    });
  },

  /**
   * Fetches a resource in the code repo.
   * @param {RequestContext} ctx Context
   * @return {Promise} A promise that resolves to the request.
   */
  fetchCode(ctx) {
    const uri = `${ctx.strainConfig.urls.code.raw}/src${ctx.path}`;

    return utils.fetch(uri).then((data) => {
      ctx.code = data;
      return ctx;
    });
  },

  /**
   * Resolves the location of the template based on the metadata
   * @param {RequestContext} ctx Context
   * @return {Promise} A promise that resolves to the request context.
   */
  resolveTemplate(ctx) {
    // TODO move to proper template selection
    // eslint-disable-next-line no-nested-ternary
    ctx.templateName = ctx.resource.meta && ctx.resource.meta.template ? ctx.resource.meta.template : (ctx.path.indexOf('SUMMARY') !== -1 ? 'nav' : 'default');

    const templatePath = path.resolve(ctx.config.buildDir, `${ctx.templateName}.js`);
    return utils.isFile(templatePath).then(() => {
      logger.debug(`found template at ${templatePath}`);
      ctx.templatePath = templatePath;
      return ctx;
    }).catch((error) => {
      logger.error('Error while loading template', error);
      return ctx;
    });
  },

  /**
   * Executes the template and resolves with the content.
   * @param {RequestContext} ctx Context
   * @return {Promise} A promise that resolves to generated output.
   */
  executeTemplate(ctx) {
    delete require.cache[require.resolve(ctx.templatePath)];
    // eslint-disable-next-line import/no-dynamic-require,global-require
    const mod = require(ctx.templatePath);
    return Promise.resolve(mod.main(ctx.resource));
  },
};

module.exports = Object.freeze(utils);
