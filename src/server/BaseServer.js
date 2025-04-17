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
import https from 'https';
import EventEmitter from 'events';
import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import cookieParser from 'cookie-parser';
import { getFetch } from '../fetch-utils.js';
import utils from './utils.js';
import packageJson from '../package.cjs';

const DEFAULT_PORT = 3000;

/**
 * Wraps the route middleware so it can catch potential promise rejections
 * during the async invocation.
 *
 * @param {ExpressMiddleware} fn an extended express middleware function
 * @returns {ExpressMiddleware} an express middleware function.
 */
export function asyncHandler(fn) {
  return (req, res, next) => (Promise.resolve(fn(req, res, next)).catch(next));
}

export class BaseServer extends EventEmitter {
  /**
   * Creates a new HelixServer for the given project.
   * @param {BaseProject} project
   */
  constructor(project) {
    super();
    this._project = project;
    this._app = express();
    this._port = DEFAULT_PORT;
    this._addr = '127.0.0.1';
    this._tls = false;
    this._scheme = 'http';
    this._key = '';
    this._cert = '';
    this._server = null;
    this._token = null;
    this._sockets = new Set();
  }

  /**
   * Returns the logger.
   * @returns {Logger} the logger.
   */
  get log() {
    return this._project.log;
  }

  async setupApp() {
    this._app.use(cookieParser());
    this._app.get('/.kill', async (req, res) => {
      res.send('Goodbye!');
      this.stop();
    });

    // eslint-disable-next-line consistent-return
    this._app.use((req, res, next) => {
      if ((req.method === 'POST' || req.method === 'GET') && req.path === '/tools/importer' && this.token) {
        const token = req.headers['x-auth-token'];
        if (token !== this.token) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
      next();
    });

    // Add GET route handler for /tools/importer
    this._app.get('/tools/importer', asyncHandler(async (req, res) => {
      const importDir = path.join(this._project.directory, 'tools', 'importer');

      // Get file path from query parameter
      let filePath = req.query.path ? decodeURIComponent(req.query.path) : null;

      if (!filePath) {
        res.status(400).send('Missing required query parameter: path');
        return;
      }

      // Convert all backslashes to forward slashes for consistent path handling
      filePath = filePath.replace(/\\/g, '/');
      // Normalize the path
      filePath = path.normalize(filePath);

      const fullPath = path.join(importDir, filePath);

      // Security check - prevent reading outside tools/import directory
      if (path.relative(importDir, fullPath).startsWith('..')) {
        res.status(403).send('Access denied');
        return;
      }

      try {
        // Check if file exists
        if (!await fs.pathExists(fullPath)) {
          res.status(404).send('File not found');
          return;
        }

        // Get file stats to determine content type
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          res.status(400).send('Cannot read directory');
          return;
        }

        // Set appropriate content type based on file extension
        const ext = path.extname(fullPath).toLowerCase();
        const contentType = {
          '.txt': 'text/plain',
          '.json': 'application/json',
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
        }[ext] || 'application/octet-stream';

        // Read and send file
        const content = await fs.readFile(fullPath);
        res.set('Content-Type', contentType);
        res.send(content);
      } catch (error) {
        this._project.log.error(`Error reading file ${fullPath}: ${error.message}`);
        res.status(500).send(`Error reading file: ${error.message}`);
      }
    }));

    // Add POST route handler for /tools/importer that accepts raw body content
    this._app.post('/tools/importer', express.raw({ type: '*/*' }), asyncHandler(async (req, res) => {
      const importDir = path.join(this._project.directory, 'tools', 'importer');

      // Get file path from query parameter
      const filePath = req.query.path;
      if (!filePath) {
        res.status(400).send('Missing required query parameter: path');
        return;
      }

      const fullPath = path.join(importDir, filePath);

      // Security check - prevent writing outside tools/import directory
      if (path.relative(importDir, fullPath).startsWith('..')) {
        res.status(403).send('Can only write files to the tools/import directory');
        return;
      }

      try {
        // Ensure directory exists
        await fs.ensureDir(path.dirname(fullPath));

        // Write file content
        const content = req.body;
        await fs.writeFile(fullPath, content);

        res.status(200).send();
      } catch (error) {
        this._project.log.error(`Error writing file ${fullPath}: ${error.message}`);
        res.status(500).send(`Error writing file: ${error.message}`);
      }
    }));
  }

  withPort(port) {
    this._port = port;
    return this;
  }

  withAddr(addr) {
    // prefer IPv4
    this._addr = addr === '*' ? '0.0.0.0' : addr;
    return this;
  }

  withTLS(key, cert) {
    this._tls = true;
    this._scheme = 'https';
    this._key = key;
    this._cert = cert;
    return this;
  }

  isStarted() {
    return this._server !== null;
  }

  get port() {
    return this._port;
  }

  get addr() {
    return this._addr;
  }

  get hostname() {
    return this._addr === '127.0.0.1' || this._addr === '0.0.0.0'
      ? 'localhost'
      : this._addr;
  }

  get scheme() {
    return this._scheme;
  }

  get token() {
    return this._token;
  }

  get app() {
    return this._app;
  }

  async start() {
    const { log } = this;
    if (this._port !== 0) {
      let retries = 1;
      if (this._project.kill && await utils.checkPortInUse(this._port, this._addr)) {
        try {
          const res = await getFetch(true)(`${this._scheme}://${this._addr}:${this._port}/.kill`);
          await res.text();
        } catch (e) {
          // ignore errors, in case the other server closes connection
        }
        retries = 10;
      }
      let inUse = true;
      while (inUse && retries > 0) {
        // eslint-disable-next-line no-await-in-loop
        inUse = await utils.checkPortInUse(this._port, this._addr);
        if (inUse) {
          // eslint-disable-next-line no-await-in-loop,no-promise-executor-return
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        retries -= 1;
      }
      if (inUse) {
        throw new Error(`Port ${this._port} already in use by another process.`);
      }
    }
    log.info(`Starting AEM dev server v${packageJson.version}`);
    await new Promise((resolve, reject) => {
      const listenCb = (err) => {
        if (err) {
          reject(new Error(`Error while starting ${this._scheme} server: ${err}`));
          return;
        }
        this._port = this._server.address().port;
        this._addr = this._server.address().address;
        log.info(`Local AEM dev server up and running: ${this.scheme}://${this.hostname}:${this.port}/`);
        if (this._project.proxyUrl) {
          log.info(`Enabled reverse proxy to ${this._project.proxyUrl}`);
        }
        this._server.on('connection', (socket) => {
          log.debug(`new connection from ${socket.remoteAddress}:${socket.remotePort}`);
          this._sockets.add(socket);
          socket.once('close', () => {
            log.debug(`closed connection from ${socket.remoteAddress}:${socket.remotePort}`);
            this._sockets.delete(socket);
          });
        });
        resolve();
      };
      if (this._tls) {
        this._server = https.createServer({
          key: this._key,
          cert: this._cert,
        }, this._app);
        this._server.listen(this._port, this._addr, listenCb);
      } else {
        this._server = this._app.listen(this._port, this._addr, listenCb);
      }
    });
    await this.setupApp();
    this.emit('started', this.server);
  }

  // eslint-disable-next-line class-methods-use-this
  async doStop() {
    // ignore
  }

  async stop() {
    if (!this._server) {
      return;
    }
    const server = this._server;
    this._server = null;
    this.emit('stopping');
    await new Promise((resolve, reject) => {
      this.log.debug('Stopping AEM dev server..');
      for (const socket of this._sockets) {
        socket.destroy();
        this._sockets.delete(socket);
      }
      server.close((err) => {
        if (err) {
          reject(new Error(`Error while stopping http server: ${err}`));
        }
        this.log.info('AEM dev server stopped.');
        resolve();
      });
    });
    await this.doStop();
    this.emit('stopped');
  }
}
