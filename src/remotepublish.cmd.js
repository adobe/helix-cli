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
const fs = require('fs-extra');
const path = require('path');
const fastly = require('@adobe/fastly-native-promises');
const chalk = require('chalk');
const ProgressBar = require('progress');
const glob = require('glob-to-regexp');
const { HelixConfig } = require('@adobe/helix-shared');
const AbstractCommand = require('./abstract.cmd.js');
const GitUtils = require('./git-utils.js');
const cliversion = require('../package.json').version;


class RemotePublishCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._wsk_auth = null;
    this._wsk_namespace = null;
    this._wsk_host = null;
    this._fastly_namespace = null;
    this._fastly_auth = null;
    this._dryRun = false;
    this._publishAPI = 'https://adobeioruntime.net/api/v1/web/helix/helix-services/publish@v2';
    this._githubToken = '';
    this._updateBotConfig = false;
    this._configPurgeAPI = 'https://app.project-helix.io/config/purge';
    this._vcl = null;
    this._dispatchVersion = null;
    this._purge = 'soft';
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
    if (!this._bar) {
      this._bar = new ProgressBar('Publishing [:bar] :action :etas', {
        total: 24 + (this._updateBotConfig ? 2 : 0),
        width: 50,
        renderThrottle: 1,
        stream: process.stdout,
      });
    }
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

  withGithubToken(value) {
    this._githubToken = value;
    return this;
  }

  withUpdateBotConfig(value) {
    this._updateBotConfig = value;
    return this;
  }

  withConfigPurgeAPI(value) {
    this._configPurgeAPI = value;
    return this;
  }

  withPurge(value) {
    this._purge = value;
    return this;
  }

  withFilter(only, exclude) {
    if (!(only || exclude)) {
      return this;
    }
    const globex = glob(only || exclude);

    const onlyfilter = (master, current) => {
      const includecurrent = current && current.name && globex.test(current.name);
      const includemaster = master && master.name && !includecurrent;
      if (includecurrent) {
        return current;
      }
      if (includemaster) {
        return master;
      }
      return undefined;
    };

    const excludefilter = (master, current) => {
      const includecurrent = current && current.name && !globex.test(current.name);
      const includemaster = master && master.name && !includecurrent;
      if (includecurrent) {
        return current;
      }
      if (includemaster) {
        return master;
      }
      return undefined;
    };

    if (only) {
      this._filter = onlyfilter;
    } else if (exclude) {
      this._filter = excludefilter;
    }

    return this;
  }

  /**
   * Adds a list of VCL files to the publish command. Each VCL file is represented
   * by a path relative to the current command (e.g. ['vcl/extensions.vcl']).
   * @param {array} value List of vcl files to add as vcl extensions
   * @returns {RemotePublishCommand} the current instance
   */
  withCustomVCLs(vcls) {
    if (vcls && vcls.length > 0) {
      const vcl = {};
      vcls.forEach((file) => {
        try {
          const fullPath = path.resolve(this.directory, file);
          const name = path.basename(fullPath, '.vcl');
          const content = fs.readFileSync(fullPath).toString();
          vcl[name] = content;
        } catch (error) {
          this.log.error(`Cannot read provided custom vcl file ${file}`);
          throw error;
        }
      });
      this._vcl = vcl;
    }
    return this;
  }

  /**
   * Sets custom dispatch version.
   * @param {string} version The custom version
   */
  withDispatchVersion(version) {
    this._dispatchVersion = version;
    return this;
  }

  showNextStep(dryrun) {
    this.progressBar().terminate();
    if (dryrun) {
      this.log.info(`✅  A new version has been prepared, but not activated. See version ${this._version} in the Fastly UI at:`);
      this.log.info(chalk.grey(`https://manage.fastly.com/configure/services/${this._fastly_namespace}/versions/${this._version}/domains`));
    } else {
      const urls = this.config.strains
        .getByFilter((strain) => strain.url)
        .map((strain) => strain.url);

      this.log.info(`✅  The following strains have been published and version ${this._version} is now online:`);
      this.config.strains.getByFilter((strain) => !!strain.url).forEach((strain) => {
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
    return request.post('https://adobeioruntime.net/api/v1/web/helix/helix-services/logging@v1', {
      json: true,
      body: {
        service: this._fastly_namespace,
        token: this._fastly_auth,
        version: this._version,
        cliversion,
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
    if (this._dryRun || !(this._purge === 'soft' || this._purge === 'hard')) {
      this.tick(1, 'skipping cache purge');
      return false;
    }

    const ok = () => {
      this.tick(1, 'purged cache', true);
      return true;
    };

    const err = (e) => {
      this.tick(1, 'failed to purge cache', true);
      this.log.error(`Cache could not get purged ${e}`);
      throw new Error('Unable to purge cache: ');
    };

    if (this._purge === 'hard') {
      return this._fastly.purgeAll().then(ok).catch(err);
    }
    return this._fastly.softPurgeKey('all').then(ok).catch(err);
  }

  async servicePublish() {
    this.tick(1, 'preparing service config for Helix', true);

    if (this._filter) {
      this.log.debug('filtering');
      try {
        const content = await GitUtils.getRawContent('.', 'master', 'helix-config.yaml');

        const other = await new HelixConfig()
          .withSource(content.toString())
          .init();

        this.log.debug(`this: ${Array.from(this.config.strains.keys()).join(', ')}`);
        this.log.debug(`other: ${Array.from(other.strains.keys()).join(', ')}`);
        const merged = other.merge(this.config, this._filter);
        this.log.debug(Array.from(merged.strains.keys()).join(', '));

        this._helixConfig = merged;
      } catch (e) {
        this.log.error(`Cannot merge configuration from master. Do you have a helix-config.yaml commited in the master branch?
${e}`);
        throw new Error('Unable to merge configurations for selective publishing');
      }
    }
    const body = {
      configuration: this.config.toJSON(),
      service: this._fastly_namespace,
      token: this._fastly_auth,
      version: this._version,
    };

    if (this._vcl) {
      body.vcl = this._vcl;
    }

    if (this._dispatchVersion) {
      body.dispatchVersion = this._dispatchVersion;
    }

    return request.post(this._publishAPI, {
      json: true,
      body,
    }).then(() => {
      this.tick(9, 'set service config up for Helix', true);
      return true;
    }).catch((e) => {
      this.tick(9, 'failed to set service config up for Helix', true);
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
    if (this._githubToken) {
      const token = this._fastly.writeDictItem(this._version, 'secrets', 'GITHUB_TOKEN', this._githubToken);
      jobs.push(token);
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

  async updateBotConfig() {
    const repos = {};
    this.tick(1, 'updating helix-bot purge config', true);
    this._strainsToPublish.forEach((strain) => {
      const url = strain.content;
      // todo: respect path
      const urlString = `${url.protocol}://${url.host}/${url.owner}/${url.repo}.git#${url.ref}`;
      if (!repos[urlString]) {
        repos[urlString] = {
          strains: [],
          key: `${url.owner}/${url.repo}#${url.ref}`,
        };
      }
      repos[urlString].strains.push(strain.name);
    });
    const response = await request.post(this._configPurgeAPI, {
      json: true,
      body: {
        github_token: this._githubToken,
        content_repositories: Object.keys(repos),
        fastly_service_id: this._fastly_namespace,
        fastly_token: this._fastly_auth,
      },
    });

    this._botStatus = {
      repos,
      response,
    };
    this.tick(1, 'updated helix-bot purge config', true);
  }

  showHelixBotResponse() {
    if (!this._botStatus) {
      return;
    }
    const { repos, response } = this._botStatus;
    // create summary
    const reposNoBot = [];
    const reposUpdated = [];
    const reposErrors = [];
    Object.keys(repos).forEach((repoUrl) => {
      const repo = repos[repoUrl];
      const info = response[repo.key];
      if (!info) {
        this.log.error(`Internal error: ${repo.key} should be in the service response`);
        reposErrors.push(repo);
        return;
      }
      if (info.errors) {
        this.log.error(`${repo.key} update failed: ${info.errors}`);
        reposErrors.push(repo);
        return;
      }
      if (!info.installation_id) {
        reposNoBot.push(repo);
        return;
      }
      if (!info.config || !info.config.caches) {
        this.log.error(`Internal error: ${repo.key} status does not have configuration details.`);
        reposErrors.push(repo);
        return;
      }
      // find the fastlyId in the cache
      const cacheInfo = info.config.caches
        .find((cache) => cache.fastlyServiceId === this._fastly_namespace);
      if (!cacheInfo) {
        this.log.error(`Internal error: ${repo.key} status does have a configuration entry for given fastly service id.`);
        reposErrors.push(repo);
        return;
      }
      if (cacheInfo.errors) {
        this.log.error(`${repo.key} update failed for given fastly service id: ${cacheInfo.errors}`);
        reposErrors.push(repo);
        return;
      }
      reposUpdated.push(repo);
    });

    if (reposUpdated.length > 0) {
      this.log.info('');
      this.log.info('Updated the purge-configuration of the following repositories:');
      reposUpdated.forEach((repo) => {
        this.log.info(chalk`- {cyan ${repo.key}} {grey (${repo.strains.join(', ')})}`);
      });
    }

    if (reposErrors.length > 0) {
      this.log.info('');
      this.log.info('The purge-configuration of following repositories were not updated due to errors (see log for details):');
      reposErrors.forEach((repo) => {
        this.log.info(chalk`- {cyan ${repo.key}} {grey (${repo.strains.join(', ')})}`);
      });
    }

    if (reposNoBot.length > 0) {
      this.log.info('');
      this.log.info('The following repositories are referenced by strains but don\'t have the helix-bot setup:');
      reposNoBot.forEach((repo) => {
        this.log.info(chalk`- {cyan ${repo.key}} {grey (${repo.strains.join(', ')})}`);
      });
      this.log.info(chalk`\nVisit {blue https://github.com/apps/helix-bot} to manage the helix bot installations.`);
    }
  }

  async init() {
    await super.init();
    this._fastly = fastly(this._fastly_auth, this._fastly_namespace);

    // gather all content repositories of the affected strains
    this._strainsToPublish = this.config.strains.getByFilter((strain) => {
      if (strain.isProxy()) {
        this.log.debug(`ignoring proxy strain ${strain.name}`);
        return false;
      }
      // skip the strains where we can't determine the action name
      if (!strain.package) {
        this.log.debug(`ignoring unaffected strain ${strain.name}`);
        return false;
      }
      return true;
    });
  }

  async run() {
    await this.init();
    if (this._strainsToPublish.length === 0) {
      this.log.warn(chalk`None of the strains contains {cyan package} information. Aborting command.`);
      return;
    }
    try {
      this.tick(1, 'preparing fastly transaction', true);
      await this._fastly.transact(async (version) => {
        this._version = version;
        await this.servicePublish();
        await this.serviceAddLogger();
        await this.updateFastlySecrets();
      }, !this._dryRun);
      if (this._updateBotConfig) {
        await this.updateBotConfig();
      }
      await this.purgeFastly();
      this.showHelixBotResponse();
      this.showNextStep(this._dryRun);
    } catch (e) {
      const message = 'Error while running the Publish command';
      this.log.error(`${message}: ${e.stack}`, e);
      throw new Error(message, e);
    }
  }
}
module.exports = RemotePublishCommand;
