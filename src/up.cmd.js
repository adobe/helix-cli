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
import { getFetch } from './fetch-utils.js';
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
      .withAllowInsecure(this._allowInsecure);
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
    }
    this._project.withProxyUrl(this._url);
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

  async verifyUrl(gitUrl, ref) {
    // check if the site is on helix5
    // https://admin.hlx.page/sidekick/adobe/www-aem-live/main/config.json
    // {
    //   "host": "aem.live",
    //     "liveHost": "main--www-aem-live--adobe.aem.live",
    //       "plugins": [
    //         {
    //           "id": "doc",
    //           "title": "Documentation",
    //           "url": "https://www.aem.live/docs/"
    //         }
    //       ],
    //         "previewHost": "main--www-aem-live--adobe.aem.page",
    //           "project": "Helix Website (AEM Live)",
    //             "testProperty": "header";
    // }
    let previewHostBase = 'hlx.page';
    const configUrl = `https://admin.hlx.page/sidekick/${gitUrl.owner}/${gitUrl.repo}/main/config.json`;
    try {
      const configResp = await getFetch(this._allowInsecure)(configUrl);
      if (configResp.ok) {
      // this is best effort for now
        const config = await configResp.json();
        const { previewHost } = config;
        if (previewHost && previewHost.endsWith('.aem.page')) {
          previewHostBase = 'aem.page';
        }
      }
      /* c8 ignore start */
      // this is notoriously hard to test, so we ignore it for now
      // but if you want to give it a try, set up a local server with a self-signed cert
      // change, /etc/hosts to point admin.hlx.page to localhost and run the test
    } catch (e) {
      if (e.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' || e.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
        await this.stop();
        this.log.error(chalk`{yellow ${configUrl}} is using an invalid certificate, please check https://github.com/adobe/helix-cli#troubleshooting for help.`);
        throw Error(e.message);
      }
    }
    /* c8 ignore stop */

    const dnsName = `${ref.replace(/\//g, '-')}--${gitUrl.repo}--${gitUrl.owner}`;
    // check length limit
    if (dnsName.length > 63) {
      this.log.error(chalk`URL {yellow https://${dnsName}.${previewHostBase}} exceeds the 63 character limit for DNS labels.`);
      this.log.error(chalk`Please use a shorter branch name or a shorter repository name.`);
      await this.stop();
      throw Error('branch name too long');
    }

    // always proxy to main
    this._url = `https://main--${gitUrl.repo}--${gitUrl.owner}.${previewHostBase}`;
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
