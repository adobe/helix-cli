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
import path from 'path';
import { HelixImportServer } from './HelixImportServer.js';
import { BaseProject } from './BaseProject.js';
import packageJson from '../package.cjs';

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

  /**
   * Writes the server token to a token.js file in the tools/importer/helix-importer-ui directory
   * @private
   */
  async _writeAemCliFile() {
    const tokenFile = path.join(this.directory, 'tools', 'importer', 'helix-importer-ui', 'js', 'aem-cli.js');
    await fs.ensureDir(path.dirname(tokenFile));
    await fs.writeFile(tokenFile, `// Generated by AEM CLI
export const AEM_CLI_TOKEN = '${this.server.token}';
export const AEM_CLI_VERSION = '${packageJson.version}';`);
  }

  async start() {
    await this._writeAemCliFile();

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

    try {
      const tokenFile = path.join(this.directory, 'tools', 'importer', 'helix-importer-ui', 'js', 'aem-cli.js');
      await fs.remove(tokenFile);
    } catch (error) {
      this.log.warn(`Failed to remove token file: ${error.message}`);
    }

    await super.doStop();
  }
}
