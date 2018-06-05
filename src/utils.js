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

const {Compiler} = require('htlengine');
const {converter} = require('md2json');

const utils = {

    /**
     * Checks if the file addressed by the given filename exists and is a regular file.
     * @param {String} filename Path to file
     * @returns {Promise} Returns promise that resolves with the filename or rejects if is not a file.
     */
    isFile: function(filename) {
        return stat(filename)
            .then(stats => {
                if (!stats.isFile()) {
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
    fetch: function(uri) {
        if (uri.charAt(0) === '/') {
            return readFile(uri);
        }
        return request(uri);
    },

    /**
     * Fetches the content and stores it in the context.
     * @param {RequestContext} ctx Context
     * @return {Promise} A promise that resolves to the request context.
     */
    fetchContent: function(ctx) {
        const uri = ctx.strainConfig.content + ctx.resourcePath + ('html' === ctx.extension ? '.md' : '.' + ctx.extension);
        return utils.fetch(uri).then(data => {
            ctx.content = data.toString();
            return ctx;
        });
    },

    /**
     * Converts the markdown content into JSON and stores it in the context.
     * @param {RequestContext} ctx Context
     * @return {Promise} A promise that resolves to the request context.
     */
    convertContent: function(ctx) {
        return converter.convert(ctx.content).then(json => {
            ctx.resource = json;
            return ctx;
        });
    },

    /**
     * Fetches the code based on the template and stores it in the context.
     * @param {RequestContext} ctx Context
     * @return {Promise} A promise that resolves to the request context.
     */
    fetchCode: function(ctx) {
        ctx.templateName = ctx.resource.meta.template;
        const uri = ctx.strainConfig.code + '/' + ctx.templateName + '.htl';
        return utils.fetch(uri).then(data => {
            ctx.code = data.toString();
            return ctx;
        });
    },

    /**
     * Compiles the template and stores the compiled filepath in the context
     * @param {RequestContext} ctx Context
     * @return {Promise} A promise that resolves to the request context.
     */
    compileHtlTemplate: function(ctx) {
        // console.log('Compiling ' + options.templatePath);
        fs.mkdirpSync(ctx.strainConfig.cache);
        const compiler = new Compiler()
            .withOutputDirectory(ctx.strainConfig.cache)
            .includeRuntime(true)
            .withRuntimeGlobalName('it');

        ctx.compiledTemplate = compiler.compile(ctx.code, ctx.templateName + '.js');
        return ctx;
    },

    /**
     * Executes the template and resolves with the content.
     * @param {RequestContext} ctx Context
     * @return {Promise} A promise that resolves to generated output.
     */
    executeTemplate: function(ctx) {
        delete require.cache[require.resolve(ctx.compiledTemplate)];
        const mod = require(ctx.compiledTemplate);
        return Promise.resolve(mod.main(ctx.resource));
    }
};

module.exports = Object.freeze(utils);
