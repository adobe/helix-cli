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
const fastly = require('@adobe/fastly-native-promises');
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
    this._publishAPI = 'https://adobeioruntime.net/api/v1/web/helix/default/publish';
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
      total: 23,
      width: 50,
      renderThrottle: 1,
      stream: process.stdout,
    });

    return this._bar;
  }

  withPublishAPI(value) {
    this._publishAPI = value;
    return this;
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
    return this;
  }

  withDryRun(value) {
    this._dryRun = value;
    return this;
  }

  showNextStep(dryrun) {
    this.progressBar().terminate();
    if (dryrun) {
      this.log.info(`✅  A new version has been prepared, but not activated. See version ${this._version} in the Fastly UI at:`);
      this.log.info(chalk.grey(`https://manage.fastly.com/configure/services/${this._fastly_namespace}/versions/${this._version}/domains`));
    } else {
      const urls = this.config.strains.getByFilter(strain => strain.url).map(strain => strain.url);

      this.log.info(`✅  The following strains have been published and version ${this._version} is now online:`);
      this.config.strains.getByFilter(strain => !!strain.url).forEach((strain) => {
        const { url } = strain;
        urls.push(url);
        this.log.info(`- ${strain.name}: ${url}`);
      });

      if (urls.length) {
        this.log.info('\nYou may now access your site using:');
        this.log.info(chalk.grey(`$ curl ${urls[0]}`));
      }
    }
  }

  serviceAddLogger() {
    return request.post('https://adobeioruntime.net/api/v1/web/helix/default/addlogger', {
      json: true,
      body: {
        service: this._fastly_namespace,
        token: this._fastly_auth,
        version: this._version,
      },
    }).then(() => {
      this.tick(10, 'set up logging', true);
    }).catch((e) => {
      this.tick(10, 'failed to set up logging', true);
      this.log.error(`Remote addlogger service failed ${e}`);
      throw new Error('Unable to set up remote logging');
    });
  }

  purgeFastly() {
    if (this._dryRun) {
      this.tick(1, 'skipping cache purge');
      return false;
    }
    return this._fastly.purgeAll()
      .then(() => {
        this.tick(1, 'purged cache', true);
        return true;
      })
      .catch((e) => {
        this.tick(1, 'failed to purge cache', true);
        this.log.error(`Cache could not get purged ${e}`);
        throw new Error('Unable to purge cache: ');
      });
  }

  servicePublish() {
    return request.post(this._publishAPI, {
      json: true,
      body: {
        configuration: this.config.toJSON(),
        service: this._fastly_namespace,
        token: this._fastly_auth,
        version: this._version,
      },
    }).then(() => {
      this.tick(10, 'set service config up for Helix', true);
      return true;
    }).catch((e) => {
      this.tick(10, 'failed to set service config up for Helix', true);
      this.log.error(`Remote publish service failed ${e}`);
      throw new Error('Unable to setup service config');
    });
  }

  async updateFastlySecrets() {
    const jobs = [];
    if (this._wsk_auth) {
      const auth = this._fastly.writeDictItem(this._version, 'secrets', 'OPENWHISK_AUTH', this._wsk_auth);
      jobs.push(auth);
    }
    if (this._wsk_namespace) {
      const namespace = this._fastly.writeDictItem(this._version, 'secrets', 'OPENWHISK_NAMESPACE', this._wsk_namespace);
      jobs.push(namespace);
    }
    return Promise.all(jobs).then(() => {
      this.tick(2, 'enabled authentication', true);
      return true;
    }).catch((e) => {
      this.tick(2, 'failed to enable authentication', true);
      this.log.error(`failed to enable authentication ${e}`);
      throw new Error('Unable to set credentials');
    });
  }

  async init() {
    await super.init();
    this._fastly = fastly(this._fastly_auth, this._fastly_namespace);
  }

  async run() {
    await this.init();
    try {
      await this._fastly.transact(async (version) => {
        this._version = version;
        await this.servicePublish();
        await this.serviceAddLogger();
        await this.updateFastlySecrets();
      }, !this._dryRun);
      await this.purgeFastly();
      this.showNextStep(this._dryRun);
    } catch (e) {
      const message = 'Error while running the Publish command';
      this.log.error(`${message}: ${e.stack}`, e);
      throw new Error(message, e);
    }
  }
}
module.exports = RemotePublishCommand;
