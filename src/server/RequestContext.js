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
import { parse } from 'url';
import utils from './utils.js';

let id = 0;

/**
 * Context that is used during request handling.
 *
 * @type {module.RequestContext}
 */
export default class RequestContext {
  constructor(request, cfg) {
    // see https://github.com/nodejs/node/issues/36550
    const req = {
      ...request,
    };
    const { url } = req;
    this._cfg = cfg || {};
    this._url = url;
    // eslint-disable-next-line no-plusplus
    this._id = id++;
    const purl = parse(url);
    this._path = purl.pathname || '/';
    this._queryString = purl.search || '';
    this._selector = '';
    this._extension = '';
    this._headers = req.headers || {};
    this._method = req.method || 'GET';
    this._params = req.query || {};
    this._requestId = utils.randomChars(32);
    this._logger = cfg.log;

    if (req.body && Object.entries(req.body).length > 0) {
      this._body = req.body;
    }
    const lastSlash = this._path.lastIndexOf('/');
    if (lastSlash === this._path.length - 1) {
      // directory request
      const index = 'index.html';
      // append index and remove multiple slashes
      this._path = `${this._path}${index}`.replace(/\/+/g, '/');
    }
    const lastDot = this._path.lastIndexOf('.');
    let relPath = lastDot >= 0 ? this._path.substring(0, lastDot) : this._path;

    if (lastDot > lastSlash) {
      this._extension = this._path.substring(lastDot + 1);
    } else {
      // append .html
      this._extension = 'html';
      this._path += '.html';
    }
    // check for selector
    const selDot = relPath.lastIndexOf('.');
    if (selDot > lastSlash) {
      this._selector = relPath.substring(selDot + 1);
      relPath = relPath.substring(0, selDot);
    }
    this._relPath = this._path;

    // prepend any content repository path
    const repoPath = '';
    if (repoPath && repoPath !== '/') {
      relPath = repoPath + relPath;
    }

    this._resourcePath = relPath;
  }

  /**
   * returns the request id / counter
   * @return {*|number}
   */
  get id() {
    return this._id;
  }

  /**
   * the original request url
   */
  get url() {
    return this._url;
  }

  /**
   * the request path, including any directoryIndex mapping.
   * @returns {*|string}
   */
  get path() {
    return this._path;
  }

  /**
   * The helix project configuration.
   * @returns {HelixProject}
   */
  get config() {
    return this._cfg;
  }

  /**
   * The request body.
   * @returns {Object}
   */
  get body() {
    return this._body;
  }

  /**
   * The path to the resource in the repository.
   * @returns {string}
   */
  get resourcePath() {
    return this._resourcePath;
  }

  /**
   * The file extension of the request path.
   * @returns {string|*}
   */
  get extension() {
    return this._extension;
  }

  /**
   * the selector of the request path.
   * @returns {string|string}
   */
  get selector() {
    return this._selector;
  }

  /**
   * The client request headers.
   * @returns {any | {}}
   */
  get headers() {
    return this._headers;
  }

  /**
   * The request method
   * @returns {*|string}
   */
  get method() {
    return this._method;
  }

  /**
   * The request params (query)
   * @returns {any | {}}
   */
  get params() {
    return this._params;
  }

  /**
   * The relative path. i.e. the request path without the mount path.
   * @returns {*}
   */
  get relPath() {
    return this._relPath;
  }

  /**
   * Returns the queryString of the url (including the ?)
   * @returns {string}
   */
  get queryString() {
    return this._queryString;
  }

  /**
   * The request id.
   * @returns {String}
   */
  get requestId() {
    return this._requestId;
  }

  /**
   * The logger;
   * @returns {Logger}
   */
  get log() {
    return this._logger;
  }

  get json() {
    const o = {
      url: this.url,
      queryString: this.queryString,
      resourcePath: this.resourcePath,
      path: this.path,
      selector: this.selector,
      extension: this.extension,
      method: this.method,
      headers: this.headers,
      params: this.params,
    };
    if (this.body) {
      o.body = this.body;
    }
    return o;
  }
}
