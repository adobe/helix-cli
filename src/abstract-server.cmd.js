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
import opn from 'open';
import { AbstractCommand } from './abstract.cmd.js';
import { context } from './fetch-utils.js';

export class AbstractServerCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._httpPort = -1;
    this._bindAddr = null;
    this._tls = false;
    this._tlsCertPath = undefined;
    this._tlsKeyPath = undefined;
    this._scheme = 'http';
    this._stopping = false;
    this._cache = null;
  }

  withHttpPort(p) {
    this._httpPort = p;
    return this;
  }

  withBindAddr(a) {
    this._bindAddr = a;
    return this;
  }

  withTLS(tlsKeyPath, tlsCertPath) {
    if (tlsKeyPath && tlsCertPath) {
      this._tls = true;
      this._tlsKeyPath = tlsKeyPath;
      this._tlsCertPath = tlsCertPath;
    }
    return this;
  }

  withOpen(o) {
    this._open = o === 'false' ? false : o;
    return this;
  }

  withCache(value) {
    this._cache = value;
    return this;
  }

  withKill(value) {
    this._kill = value;
    return this;
  }

  get project() {
    return this._project;
  }

  async doStop() {
    if (this._project) {
      await this._project.stop();
      delete this._project;
    }
    await context.reset();
  }

  async stop() {
    if (this._stopping) {
      return;
    }
    this._stopping = true;
    await this.doStop();
    this.emit('stopped', this);
  }

  async run() {
    await this.init();
    await this._project.start();
    this.emit('started', this);
    if (this._open) {
      await this.open(this._open);
    }
  }

  async open(href) {
    let url;
    try {
      url = new URL(href.startsWith('/')
        ? `${this._project.server.scheme}://${this._project.server.hostname}:${this._project.server.port}${href}`
        : href);
    } catch (e) {
      throw Error('invalid argument for --open. either provide an relative url starting with \'/\' or an absolute http(s) url.');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw Error(`refuse to open non http(s) url (--open): ${url}`);
    }
    this.log.info(`opening default browser: ${url.href}`);
    await opn(url.href);
  }
}
