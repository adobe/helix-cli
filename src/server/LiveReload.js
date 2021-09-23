/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
// eslint-disable-next-line max-classes-per-file
const fs = require('fs');
const { EventEmitter } = require('events');
const WebSocket = require('faye-websocket');
const chokidar = require('chokidar');

/**
 * Client connection for the live reload server.
 */
class ClientConnection extends EventEmitter {
  static nextId() {
    ClientConnection.counter = (ClientConnection.counter || 0) + 1;
    return `ws${ClientConnection.counter}`;
  }

  constructor(req, socket, head) {
    super();
    this.id = ClientConnection.nextId();
    this.ws = new WebSocket(req, socket, head);
    this.ws.onmessage = this._onMessage.bind(this);
    this.ws.onclose = this._onClose.bind(this);
  }

  _onMessage(event) {
    let data = {};
    try {
      data = JSON.parse(event.data);
    } catch {
      // ignore
    }
    switch (data.command) {
      case 'hello':
        return this._cmdHello(data);
      case 'info':
        return this._cmdInfo(data);
      default:
        return {};
    }
  }

  _onClose(event) {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.emit('end', event);
  }

  _cmdHello() {
    this._send({
      command: 'hello',
      protocols: [
        'http://livereload.com/protocols/official-7',
      ],
      serverName: 'helix-simulator',
    });
  }

  _cmdInfo(data) {
    if (data) {
      this.plugins = data.plugins;
      this.url = data.url;
    }
    return { ...data || {}, id: this.id, url: this.url };
  }

  _send(data) {
    if (this.ws) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendReload(files) {
    files.forEach((file) => {
      this._send({
        command: 'reload',
        path: file,
        liveCSS: true,
        reloadMissingCSS: true,
        liveImg: true,
      });
    }, this);
  }

  sendAlert(message) {
    this._send({
      command: 'alert',
      message,
    });
  }
}

/**
 * Live reload file watcher and server.
 */
class LiveReload {
  constructor(logger) {
    // file to request mapping
    this._fileMapping = new Map();
    // pending requests by request id
    this._pending = new Map();
    this._logger = logger;

    // client connections
    this._connections = {};
    this._liveReloadJSPath = require.resolve('livereload-js/dist/livereload.js');
  }

  get log() {
    return this._logger;
  }

  startRequest(requestId, pathname) {
    this._pending.set(requestId, {
      pathname,
      files: [],
    });
  }

  endRequest(requestId) {
    const info = this._pending.get(requestId);
    if (!info) {
      this.log.debug('unable to register accessed files. info does not exist: ', requestId);
      return;
    }
    this._pending.delete(requestId);
    this._watcher.add(info.files);
    info.files.forEach((file) => {
      this._fileMapping.set(file, info.pathname);
    });
  }

  registerFile(requestId, filePath) {
    const info = this._pending.get(requestId);
    if (info) {
      info.files.push(filePath);
    } else {
      this.log.debug(`unable to register file ${filePath}. info for ${requestId} does not exit.`);
    }
  }

  init(app, httpServer) {
    this._server = httpServer;
    app.get('/__internal__/livereload.js', this._serveLiveReload.bind(this));
    httpServer.on('upgrade', this._onSvrUpgrade.bind(this));
    httpServer.on('error', this._onSvrError.bind(this));
    httpServer.on('close', this._onSvrClose.bind(this));
    this._initWatcher();
  }

  _initWatcher() {
    let timer = null;
    let modifiedFiles = {};

    this._watcher = chokidar.watch([], {
      ignored: [/(.*\.swx|.*\.swp|.*~)/],
      persistent: true,
      ignoreInitial: true,
    });

    this._watcher.on('all', (eventType, file) => {
      modifiedFiles[file] = true;
      if (timer) {
        clearTimeout(timer);
      }
      // debounce a bit in case several files are changed at once
      timer = setTimeout(async () => {
        timer = null;
        const files = Object.keys(modifiedFiles);
        modifiedFiles = {};

        // inform clients
        this.changed(files);
      }, 100);
    });
  }

  async stop() {
    if (this._watcher) {
      await this._watcher.close();
      this._watcher = null;
    }
    this._onSvrClose();
  }

  _onSvrUpgrade(req, socket, head) {
    const cx = new ClientConnection(req, socket, head);
    this._connections[cx.id] = cx;

    socket.on('error', (e) => {
      if (e.code === 'ECONNRESET') {
        return;
      }
      this._error(e);
    });

    cx.once('end', () => {
      this.log.debug(`websocket connection closed ${cx.id} (url: ${cx.url})`);
      delete this._connections[cx.id];
    });
  }

  _onSvrClose() {
    Object.values(this._connections).forEach((cx) => {
      cx.close();
    }, this);
  }

  _onSvrError(e) {
    this.log.error(e);
  }

  _serveLiveReload(req, res) {
    res.setHeader('content-type', 'application/javascript');
    fs.createReadStream(this._liveReloadJSPath).pipe(res);
  }

  changed(files) {
    this.log.debug(`changed files: ${files}`);

    // map each file to the registered source
    const sources = new Set();
    files.forEach((file) => {
      const mapping = this._fileMapping.get(file);
      if (mapping) {
        sources.add(mapping);
      }
    });
    const modified = Array.from(sources);

    Object.values(this._connections).forEach((cx) => {
      this.log.debug(`reloading client ${cx.id} (url: ${cx.url})`);
      cx.sendReload(modified);
    });
  }

  alert(message) {
    this.log.debug(`alert: ${message}`);
    Object.values(this._connections).forEach((cx) => {
      this.log.debug(`alert client ${cx.id} (url: ${cx.url})`);
      cx.sendAlert(message);
    });
  }
}

module.exports = LiveReload;
