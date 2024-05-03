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
import chalk from 'chalk-template';
import fs from 'fs/promises';
import fse from 'fs-extra';
import { resetContext } from './fetch-utils.js';
import { AbstractCommand } from './abstract.cmd.js';

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
    await resetContext();
  }

  async stop() {
    if (this._stopping) {
      return;
    }
    this._stopping = true;
    await this.doStop();
    this.emit('stopped', this);
  }

  async initServerOptions() {
    if (this._cache) {
      await fse.ensureDir(this._cache);
      this._project.withCacheDirectory(this._cache);
    }

    if (this._tls) {
      if (
        !this._tlsCertPath
        || !this._tlsKeyPath
      ) {
        throw Error(chalk`{red If using TLS, you must provide both tls cert and tls key...one or both not found }`);
      }
      // read each file
      try {
        const key = await fs.readFile(this._tlsKeyPath);
        const cert = await fs.readFile(this._tlsCertPath);
        this._project.withTLS(key, cert);
        // if all of that works, switch to https scheme
        this._scheme = 'https';
      } catch (e) {
        throw Error(chalk`{red Unable to read the tls key key or cert file. }`);
      }
    }
    if (this._httpPort >= 0) {
      this._project.withHttpPort(this._httpPort);
    }
    if (this._bindAddr) {
      this._project.withBindAddr(this._bindAddr);
    }
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
    if (!url.href.match(/^[a-zA-Z0-9._:/?%=&-]+$/)) {
      throw Error(`refuse to open unsafe url (--open): ${url}`);
    }
    this.log.info(`opening default browser: ${url.href}`);
    await opn(url.href);
  }
}
