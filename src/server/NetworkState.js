/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import fs from 'fs';
import chokidar from 'chokidar';
import WebSocket from 'faye-websocket';
import { EventEmitter } from 'events';
import { createRequire } from 'module';

/**
 * Client connection for the live reload server.
 */
export default class NetworkState extends EventEmitter {
  constructor(log) {
    super();
    this.log = log;
    this._up = true;
  }

  enable(value) {
    if (value !== this._up) {
      this._up = value;
      if (value) {
        this.emit('up');
      } else {
        this.emit('down');
      }
    }
  }

  onProxyStatus(status) {
    if (status === 504 || status === 503) {
      if (this._up) {
        this.log.info(`received ${status} from server, setting network status to degraded.`);
        // todo: start monitor
        this.enable(false);
      }
    }
  }

  get up() {
    return this._up;
  }

  get down() {
    return !this._up;
  }

  // eslint-disable-next-line class-methods-use-this
  close() {
    // ignore
  }
}

