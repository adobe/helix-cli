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
/**
 * Context that is used during request handling.
 *
 * @type {module.RequestContext}
 */
module.exports = class RequestContext {

    constructor(req, cfg) {
        const url = req.url;
        this._cfg = cfg;

        // regex for:   /<strain>/<path>
        const matcher = /([^\/]+)(.*)/;
        const match = matcher.exec(url);
        this._url = url;
        if (!match) {
            this._valid = false;
        } else {
            this._valid = true;
            this._strain = match[1];
            this._path = match[2] || '/';
            
            let relPath = this._path;
            const lastSlash = relPath.lastIndexOf('/');
            const lastDot = relPath.lastIndexOf('.');
            if (lastDot > lastSlash) {
                relPath = relPath.substring(0, lastDot);
                const queryParamIndex = this._path.lastIndexOf('?');
                this._extension = this._path.substring(lastDot + 1, (queryParamIndex !== -1 ? queryParamIndex : this._path.length));
            } else if (lastSlash === relPath.length - 1) {
                relPath += 'index';
            }
            this._resourcePath = relPath; 
        }
    }

    get url() {
        return this._url;
    }

    get valid() {
        return this._valid;
    }

    get strain() {
        return this._strain;
    }

    get path() {
        return this._path;
    }

    get config() {
        return this._cfg;
    }

    get strainConfig() {
        return this._cfg.strains[this._strain];
    }

    get resourcePath() {
        return this._resourcePath;
    }

    get extension() {
        return this._extension;
    }
};
