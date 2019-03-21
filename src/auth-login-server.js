/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const http = require('http');
const EventEmitter = require('events');

class LoginServer extends EventEmitter {
  constructor() {
    super();
    this._log = null;
    this._srv = null;
    this._token = null;
    this._isClosing = null;
    this._origin = null;
  }

  withLogger(value) {
    this._log = value;
    return this;
  }

  withOrigin(value) {
    this._origin = value;
    return this;
  }

  get log() {
    return this._log;
  }

  async waitForToken() {
    if (this._token) {
      return this._token;
    }
    return new Promise((resolve) => {
      this.on('token', resolve);
    });
  }

  get port() {
    return this._srv.address().port;
  }

  async stop() {
    if (this._srv) {
      return new Promise((resolve) => {
        this._srv.close(resolve);
        this._srv = null;
      });
    }
    return Promise.resolve();
  }

  async start() {
    return new Promise((resolve, reject) => {
      this._srv = http.createServer((req, res) => {
        this.log.debug(req.headers);
        this.log.debug(req.method);

        if (req.method === 'GET') {
          // just respond with a little hello world.
          res.end('Hello, world.');
          return;
        }
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': this._origin,
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }

        // read body
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          res.end();
          this.log.debug('got body', body);
          // assume json...
          const data = JSON.parse(body);
          if (data.token) {
            this.emit('token', data.token);
          }
        });
        req.on('error', reject);
      }).listen({
        port: 0,
        host: '127.0.0.1',
      }, () => {
        this.log.debug(`server started on ${JSON.stringify(this._srv.address())}`);
        resolve();
      });
    });
  }
}

module.exports = LoginServer;
