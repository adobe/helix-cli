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

/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */

const request = require('request-promise-native');
const chalk = require('chalk');
const ProgressBar = require('progress');
const AbstractCommand = require('./abstract.cmd.js');


class RemotePublishCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._wsk_auth = null;
    this._wsk_namespace = null;
    this._wsk_host = null;
    this._fastly_namespace = null;
    this._fastly_auth = null;
    this._dryRun = false;
  }

  tick(ticks = 1, message, name) {
    if (name === true) {
      // eslint-disable-next-line no-param-reassign
      name = message;
    }
    this.progressBar().tick(ticks, {
      action: name || '',
    });
    if (message) {
      this.log.log({
        progress: true,
        level: 'info',
        message,
      });
    }
  }

  progressBar() {
    if (this._bar) {
      return this._bar;
    }
    this._bar = new ProgressBar('Publishing [:bar] :action :etas', {
      total: 2,
      width: 50,
      renderThrottle: 1,
      stream: process.stdout,
    });

    return this._bar;
  }

  withWskHost(value) {
    this._wsk_host = value;
    return this;
  }

  withWskAuth(value) {
    this._wsk_auth = value;
    return this;
  }

  withWskNamespace(value) {
    this._wsk_namespace = value;
    return this;
  }

  withFastlyNamespace(value) {
    this._fastly_namespace = value;
    return this;
  }

  withFastlyAuth(value) {
    this._fastly_auth = value;
    this._options.headers['Fastly-Key'] = value;
    return this;
  }

  withDryRun(value) {
    this._dryRun = value;
    return this;
  }

  showNextStep() {
    const strains = this._strains;

    const urls = strains.filter(strain => strain.url).map(strain => strain.url);
    this.progressBar().terminate();

    this.log.info(`✅  The following strains have been published and version ${this._version} is now online:`);
    this._strains.forEach((strain) => {
      if (strain.package) {
        const url = strain.url ? ` -> ${strain.url}` : '';
        this.log.info(`- ${strain.name}${url}`);
      }
    });

    if (urls.length) {
      this.log.info('\nYou now access your site using:');
      this.log.info(chalk.grey(`$ curl ${urls[0]}`));
    }
  }

  async publish() {

  }

  async addlogger() {

  }

  async purge() {

  }

  async prepare() {

  }

  async init() {
    await super.init();
  }

  async run() {
    await this.init();
    try {
      await this.prepare();
      await this.addlogger();
      await this.publish();
      await this.purge();
      this.showNextStep();
    } catch (e) {
      const message = 'Error while running the Publish command';
      this.log.error(`${message}: ${e.stack}`, e);
      throw new Error(message, e);
    }
  }
}
module.exports = RemotePublishCommand;
