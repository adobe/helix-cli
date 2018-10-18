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

const utils = require('./utils.js');

/**
 * Context that is used during request handling.
 *
 * @type {module.RequestContext}
 */
module.exports = class RequestContext {
  constructor(req, cfg) {
    const { url } = req;
    this._cfg = cfg;
    this._url = url;
    this._path = url || '/';
    this._selector = '';
    this._extension = '';
    this._headers = req.headers || {};
    this._method = req.method || 'GET';
    this._params = req.query || {};
    this._wskActivationId = utils.randomChars(32, true);
    this._requestId = utils.randomChars(32);
    this._cdnRequestId = utils.uuid();

    let relPath = this._path;
    const lastSlash = relPath.lastIndexOf('/');
    const lastDot = relPath.lastIndexOf('.');
    if (lastDot > lastSlash) {
      relPath = relPath.substring(0, lastDot);
      const queryParamIndex = this._path.lastIndexOf('?');
      this._extension = this._path.substring(
        lastDot + 1,
        (queryParamIndex !== -1 ? queryParamIndex : this._path.length),
      );
      // check for selector
      const selDot = relPath.lastIndexOf('.');
      if (selDot > lastSlash) {
        this._selector = relPath.substring(selDot + 1);
        relPath = relPath.substring(0, selDot);
      }
    } else if (lastSlash === relPath.length - 1) {
      relPath += 'index';
    }
    this._resourcePath = relPath;

    // generate headers
    this._wskHeaders = Object.assign({
      'X-Openwhisk-Activation-Id': this._wskActivationId,
      'X-Request-Id': this._requestId,
      'X-Backend-Name': 'localhost--F_Petridish',
      'X-CDN-Request-ID': this._cdnRequestId,
    }, this._headers);
  }

  get url() {
    return this._url;
  }

  // eslint-disable-next-line class-methods-use-this
  get valid() {
    return true;
  }

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

  get resourcePath() {
    return this._resourcePath;
  }

  get extension() {
    return this._extension;
  }

  get selector() {
    return this._selector;
  }

  get headers() {
    return this._headers;
  }

  get wskHeaders() {
    return this._wskHeaders;
  }

  get method() {
    return this._method;
  }

  get params() {
    return this._params;
  }

  get json() {
    const o = {
      url: this.url,
      resourcePath: this.resourcePath,
      path: this.path,
      selector: this.selector,
      extension: this.extension,
      method: this.method,
      headers: this.headers,
      params: this.params,
    };
    return o;
  }
};
