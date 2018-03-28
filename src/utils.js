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
const path = require('path');
const fs = require('fs');
const util = require('util');
const stat = util.promisify(fs.stat);
const {Compiler} = require('htlengine');

class PathInfo {

    constructor(req) {
        const url = req.url;

        // regex for:   /   org   /   repo  /  branch / path
        const matcher = /([^\/]+)\/([^\/]+)\/([^\/]+)(.*)/;
        const match = matcher.exec(url);
        this._url = url;
        if (!match) {
            this._valid = false;
        } else {
            this._valid = true;
            this._org = match[1];
            this._repo = match[2];
            this._branch = match[3];
            this._path = match[4] || '/';
        }
    }

    get url() {
        return this._url;
    }

    get valid() {
        return this._valid;
    }

    get org() {
        return this._org;
    }

    get repo() {
        return this._repo;
    }

    get branch() {
        return this._branch;
    }

    get path() {
        return this._path;
    }
}

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
     * Parses the url of the given request and returns a path info object.
     * @param {Express.req} req Express request
     * @returns {PathInfo} A path info
     */
    getPathInfo: function(req) {
        return new PathInfo(req);
    },

    /**
     * Resolves the resource addressed by path info.
     * @param {*} cfg Global config.
     * @param {*} strain Current strain configuration
     * @param {PathInfo} pathInfo Path info
     * @param {boolean} [mustExist] If {@code true} only resolves if file exists
     * @return {Promise<String>} Promise that resolves to the resolved filesystem path or rejects if not defined
     */
    resolve: function(cfg, strain, pathInfo, mustExist = false) {
        // for now, just do simple extension trimming - no selectors support
        let relPath = pathInfo.path;
        const lastSlash = relPath.lastIndexOf('/');
        const lastDot = relPath.lastIndexOf('.');
        if (lastDot > lastSlash) {
            relPath = relPath.substring(0, lastDot);
        } else if (lastSlash === relPath.length - 1) {
            relPath += 'index';
        }
        const fullpath = path.join(cfg.baseDir, strain.content, pathInfo.branch, relPath + '.md');
        if (!mustExist) {
            return Promise.resolve(fullpath);
        }
        return utils.isFile(fullpath);
    },

    /**
     * Resolves the template given the configuration and resource metadata.
     * @param {*} cfg Global config.
     * @param {*} strain Current strain configuration
     * @param {PathInfo} pathInfo Path info
     * @param {*} mdInfo The markdown info
     * @returns {Promise<T>} A promise that resolves to an object holding information about the paths
     */
    resolveTemplate: function(cfg, strain, pathInfo, mdInfo) {
        const templateBasePath = path.join(cfg.baseDir, strain.code, pathInfo.branch, mdInfo.meta.template);
        const compiledPath = templateBasePath + '.js';

        // for now, just check for .htl templates
        return utils
            .isFile(templateBasePath + '.htl')
            .then(templatePath => {
                return { templatePath, compiledPath };
            });
    },

    /**
     * Compiles a HTL template.
     * @param {*} options Compile options
     * @param {String} options.templatePath Path of the HTL template
     * @param {String} options.compiledPath Path of the output file.
     * @returns {Promise<String>} A promise that resolves to the compiled path
     */
    compileHtlTemplate: function(options) {
        // console.log('Compiling ' + options.templatePath);
        const compiler = new Compiler()
            .withOutputFile(options.compiledPath)
            .includeRuntime(true)
            .withRuntimeGlobalName('it');

        const filename = compiler.compileFile(options.templatePath);
        // console.log(`Compiled: ${filename}`);
        return Promise.resolve(filename);
    },

    executeTemplate: function(compiledPath, payload) {
        delete require.cache[require.resolve(compiledPath)];
        const mod = require(compiledPath);
        return Promise.resolve(mod.main(payload));
    }
};

module.exports = Object.freeze(utils);
