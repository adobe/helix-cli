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
/**
 * StrainConfig wrapper
 *
 * @type {module.StrainURLs}
 */
const GitUrlParse = require('git-url-parse');

const RAW_TYPE = 'raw';
const API_TYPE = 'api';
const DEFAULT_BRANCH = 'master';
const MATCH_IP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;

const constructUrl = (urlParse, type) => {
  if (MATCH_IP.test(urlParse.resource)) {
    return `${urlParse.protocols[0]}://${urlParse.resource}${urlParse.port ? `:${urlParse.port}` : ''}/${type}`;
  }
  return `${urlParse.protocols[0]}://${type}.${urlParse.resource}${urlParse.port ? `:${urlParse.port}` : ''}`;
};

module.exports = class GitUrl {
  constructor(url) {
    this._urlParse = GitUrlParse(url);
  }

  get raw() {
    let url = constructUrl(this._urlParse, RAW_TYPE);
    url += `/${this.owner}/${this.repo}/${this.ref}`;
    return url;
  }

  get rawRoot() {
    return constructUrl(this._urlParse, RAW_TYPE);
  }

  get apiRoot() {
    return constructUrl(this._urlParse, API_TYPE);
  }

  get owner() {
    return this._urlParse.owner;
  }

  get repo() {
    return this._urlParse.name;
  }

  get ref() {
    return this._urlParse.ref || DEFAULT_BRANCH;
  }

  toString() {
    return `${this._urlParse}`;
  }
};
