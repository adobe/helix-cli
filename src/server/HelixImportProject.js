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
import fs from 'fs-extra';
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

  withHeadersFile(value) {
    this._headersFile = value;
    return this;
  }

  get headersFile() {
    return this._headersFile;
  }

  get cliHeaders() {
    return this._cliHeaders;
  }

  async start() {
    this.log.debug('Launching AEM import server for importing content...');
    await super.start();
    try {
      this._cliHeaders = (this._headersFile) ? await fs.readJSON(this._headersFile) : {};
    } catch (error) {
      this.log.error(`Failed to read headers file: ${error.message}`);
      await this.doStop();
    }
    return this;
  }

  async doStop() {
    this.log.debug('Stopping AEM import server..');
    await super.doStop();
  }
}
