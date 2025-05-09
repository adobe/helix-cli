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
import path from 'path';
import fse from 'fs-extra';
import chalk from 'chalk-template';
import chokidar from 'chokidar';
import { HelixProject } from './server/HelixProject.js';
import GitUtils from './git-utils.js';
import pkgJson from './package.cjs';
import { AbstractServerCommand } from './abstract-server.cmd.js';

export default class UpCommand extends AbstractServerCommand {
  withLiveReload(value) {
    this._liveReload = value;
    return this;
  }

  withUrl(value) {
    this._url = value;
    return this;
  }

  withPrintIndex(value) {
    this._printIndex = value;
    return this;
  }

  withAllowInsecure(value) {
    this._allowInsecure = value;
    return this;
  }

  withSiteToken(value) {
    this._siteToken = value;
    return this;
  }

  async doStop() {
    await super.doStop();
    if (this._watcher) {
      const watcher = this._watcher;
      delete this._watcher;
      await watcher.close();
    }
  }

  async init() {
    await super.init();
    // check for git repository
    try {
      const stat = await fse.lstat(path.resolve(this.directory, '.git'));
      if (stat.isFile()) {
        throw Error('git submodules are not supported.');
      }
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw Error('aem up needs local git repository.');
      }
      throw e;
    }

    // init dev default file params
    this._project = new HelixProject()
      .withCwd(this.directory)
      .withLiveReload(this._liveReload)
      .withLogger(this._logger)
      .withKill(this._kill)
      .withPrintIndex(this._printIndex)
      .withAllowInsecure(this._allowInsecure)
      .withSiteToken(this._siteToken);

    this.log.info(chalk`{yellow     ___    ________  ___                          __      __ v${pkgJson.version}}`);
    this.log.info(chalk`{yellow    /   |  / ____/  |/  /  _____(_)___ ___  __  __/ /___ _/ /_____  _____}`);
    this.log.info(chalk`{yellow   / /| | / __/ / /|_/ /  / ___/ / __ \`__ \\/ / / / / __ \`/ __/ __ \\/ ___/}`);
    this.log.info(chalk`{yellow  / ___ |/ /___/ /  / /  (__  ) / / / / / / /_/ / / /_/ / /_/ /_/ / /}`);
    this.log.info(chalk`{yellow /_/  |_/_____/_/  /_/  /____/_/_/ /_/ /_/\\__,_/_/\\__,_/\\__/\\____/_/}`);
    this.log.info('');

    const ref = await GitUtils.getBranch(this.directory);
    this._gitUrl = await GitUtils.getOriginURL(this.directory, { ref });
    if (!this._gitUrl) {
      throw Error('No git remote found. Make sure you have a remote "origin" configured.');
    }
    if (!this._url) {
      await this.verifyUrl(this._gitUrl, ref);
    } else if (/\{\{(owner|repo)+\}\}/.test(this._url)) {
      this._url = this._url
        .replace(/\{\{owner\}\}/, this._gitUrl.owner)
        .replace(/\{\{repo\}\}/, this._gitUrl.repo);
    }
    this._project.withProxyUrl(this._url);
    const { site, org } = this.extractSiteAndOrg(this._url);
    if (site && org) {
      this._project
        .withSite(site)
        .withOrg(org)
        .withSiteLoginUrl(
          // TODO switch to production URL
          `https://admin.hlx.page/login/${org}/${site}/main?client_id=aem-cli&redirect_uri=${encodeURIComponent(`http://localhost:${this._httpPort}/.aem/cli/login/ack`)}&selectAccount=true`,
        );
    }

    await this.initServerOptions();

    try {
      await this._project.init();
      this.watchGit();
    } catch (e) {
      throw Error(`Unable to start AEM: ${e.message}`);
    }

    this._project.on('stopped', async () => {
      await this.stop();
    });
  }

  // eslint-disable-next-line class-methods-use-this
  extractSiteAndOrg(url) {
    const { hostname } = new URL(url);
    const parts = hostname.split('.');
    const errorResult = { site: null, org: null };
    if (parts.length < 3) {
      return errorResult;
    }
    if (!['live', 'page'].includes(parts[2]) || !['hlx', 'aem'].includes(parts[1])) {
      return errorResult;
    }
    const [, site, org] = parts[0].split('--');
    return { site, org };
  }

  async verifyUrl(gitUrl, ref) {
    const dnsName = `${ref.replace(/\//g, '-')}--${gitUrl.repo}--${gitUrl.owner}`;
    // check length limit
    if (dnsName.length > 63) {
      this.log.error(chalk`URL {yellow https://${dnsName}.aem.page} exceeds the 63 character limit for DNS labels.`);
      this.log.error(chalk`Please use a shorter branch name or a shorter repository name.`);
      await this.stop();
      throw Error('branch name too long');
    }

    // always proxy to main
    this._url = `https://main--${gitUrl.repo}--${gitUrl.owner}.aem.page`;
  }

  /**
   * Watches the git repository for changes and restarts the server if necessary.
   */
  watchGit() {
    let timer = null;

    this._watcher = chokidar.watch(path.resolve(this._project.directory, '.git'), {
      persistent: true,
      ignoreInitial: true,
    });

    this._watcher.on('all', (eventType, file) => {
      if (file.endsWith('.git/HEAD') || file.endsWith('.git\\HEAD') || file.match(/\.git[/\\]refs[/\\]heads[/\\].+/)) {
        if (timer) {
          clearTimeout(timer);
        }
        // debounce a bit in case several files are changed at once
        timer = setTimeout(async () => {
          timer = null;
          if (!this._watcher) {
            // watcher was closed in the meantime
            return;
          }
          try {
            // restart if any of the files is not ignored
            const ref = await GitUtils.getBranch(this.directory);
            const gitUrl = await GitUtils.getOriginURL(this.directory, { ref });
            if (gitUrl.toString() !== this._gitUrl.toString()) {
              this.log.info('git HEAD or remotes changed, reconfiguring server...');
              this._gitUrl = gitUrl;
              await this.verifyUrl(gitUrl, ref);
              this._project.withProxyUrl(this._url);
              await this._project.initHeadHtml();
              this.log.info(`Updated proxy to ${this._url}`);
              this.emit('changed', this);
            }
          } catch {
            // ignore
          }
        }, 100);
      }
    });
  }
}
