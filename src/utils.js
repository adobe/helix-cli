/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
const fs = require('fs-extra');
const util = require('util');

const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);
const request = require('request-promise');

const { Compiler } = require('@adobe/htlengine');
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
          // eslint-disable-next-line no-console
          console.log('resolved path no regular file: %j', stats);
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
    // eslint-disable-next-line no-console
    console.debug('Fetching...', uri);
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
    const uri = ctx.strainConfig.urls.content.raw + ctx.resourcePath + (ctx.extension === 'html' ? '.md' : `.${ctx.extension}`);

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
   * Fetches the code based on the template and stores it in the context.
   * @param {RequestContext} ctx Context
   * @return {Promise} A promise that resolves to the request context.
   */
  fetchPre(ctx) {
    // TODO move to proper template selection
    // eslint-disable-next-line no-nested-ternary
    ctx.templateName = ctx.resource.meta && ctx.resource.meta.template ? ctx.resource.meta.template : (ctx.path.indexOf('SUMMARY') !== -1 ? 'nav' : 'default');
    const uri = `${ctx.strainConfig.urls.code.raw}/src/${ctx.templateName}.pre.js`;
    return utils.fetch(uri).then((data) => {
      fs.mkdirpSync(ctx.strainConfig.cache);

      const fileName = `${ctx.strainConfig.cache}/${ctx.templateName}.pre.js`;
      fs.writeFileSync(fileName, data.toString());

      ctx.precode = fileName;
      return ctx;
    }).catch(() => {
      // eslint-disable-next-line no-console
      console.debug(`No pre file found for template '${ctx.templateName}'`);
      return ctx;
    });
  },

  /**
   * Executes the template and resolves with the content.
   * @param {RequestContext} ctx Context
   * @return {Promise} A promise that resolves to generated output.
   */
  executePre(ctx) {
    if (ctx.precode) {
      try {
        delete require.cache[require.resolve(ctx.precode)];
        // todo: consider flushing module cache
        // eslint-disable-next-line import/no-dynamic-require,global-require
        const mod = require(ctx.precode);
        return mod.main(ctx).catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Error while executing pre file', error);
          return ctx;
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error while trying to execute pre file', error);
        return ctx;
      }
    }
    // no pre file found.
    return ctx;
  },

  /**
   * Fetches the code based on the template and stores it in the context.
   * @param {RequestContext} ctx Context
   * @return {Promise} A promise that resolves to the request context.
   */
  fetchTemplate(ctx) {
    // TODO move to proper template selection
    // eslint-disable-next-line no-nested-ternary
    ctx.templateName = ctx.resource.meta && ctx.resource.meta.template ? ctx.resource.meta.template : (ctx.path.indexOf('SUMMARY') !== -1 ? 'nav' : 'default');
    const uri = `${ctx.strainConfig.urls.code.raw}/src/${ctx.templateName}.htl`;

    return utils.fetch(uri).then((data) => {
      ctx.code = data.toString();
      return ctx;
    });
  },

  /**
   * Compiles the template and stores the compiled filepath in the context
   * @param {RequestContext} ctx Context
   * @return {Promise} A promise that resolves to the request context.
   */
  compileHtlTemplate(ctx) {
    // console.log('Compiling ' + options.templatePath);
    fs.mkdirpSync(ctx.strainConfig.cache);
    const compiler = new Compiler()
      .withOutputDirectory(ctx.strainConfig.cache)
      .includeRuntime(true)
      .withRuntimeGlobalName('it');

    ctx.compiledTemplate = compiler.compile(ctx.code, `${ctx.templateName}.js`);
    return ctx;
  },

  /**
   * Executes the template and resolves with the content.
   * @param {RequestContext} ctx Context
   * @return {Promise} A promise that resolves to generated output.
   */
  executeTemplate(ctx) {
    delete require.cache[require.resolve(ctx.compiledTemplate)];
    // eslint-disable-next-line import/no-dynamic-require,global-require
    const mod = require(ctx.compiledTemplate);
    return Promise.resolve(mod.main(ctx.resource));
  },
};

module.exports = Object.freeze(utils);
