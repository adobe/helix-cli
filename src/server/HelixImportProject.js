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
import { HelixImportServer } from './HelixImportServer.js';
import { BaseProject } from './BaseProject.js';

export class HelixImportProject extends BaseProject {
  constructor() {
    super(HelixImportServer);

    this._allowInsecure = true;
  }

  withAllowInsecure(value) {
    this._allowInsecure = value;
    return this;
  }

  get allowInsecure() {
    return this._allowInsecure;
  }

  async start() {
    this.log.debug('Launching AEM import server for importing content...');
    await super.start();
    return this;
  }

  async doStop() {
    this.log.debug('Stopping AEM import server..');
    await super.doStop();
  }
}
