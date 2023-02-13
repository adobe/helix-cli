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
import fs from 'fs/promises';
import path from 'path';
import fse from 'fs-extra';
import opn from 'open';
import chalk from 'chalk-template';
import chokidar from 'chokidar';
import HelixProject from './server/HelixProject.js';
import GitUtils from './git-utils.js';
import pkgJson from './package.cjs';
import { fetch } from './fetch-utils.js';
import AbstractCommand from './abstract.cmd.js';

export default class UpCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._httpPort = -1;
    this._tls = false;
    this._tlsCertPath = undefined;
    this._tlsKeyPath = undefined;
    this._open = '/';
    this._liveReload = false;
    this._url = null;
    this._cache = null;
    this._printIndex = false;
  }

  withHttpPort(p) {
    this._httpPort = p;
    return this;
  }

  withTLS(tlsKeyPath, tlsCertPath) {
    this._tls = true;
    this._tlsKeyPath = tlsKeyPath;
    this._tlsCertPath = tlsCertPath;
    return this;
  }

  withOpen(o) {
    this._open = o === 'false' ? false : o;
    return this;
  }

  withLiveReload(value) {
    this._liveReload = value;
    return this;
  }

  withUrl(value) {
    this._url = value;
    return this;
  }

  withCache(value) {
    this._cache = value;
    return this;
  }

  withPrintIndex(value) {
    this._printIndex = value;
    return this;
  }

  withKill(value) {
    this._kill = value;
    return this;
  }

  get project() {
    return this._project;
  }

  async stop() {
    if (this._project) {
      try {
        await this._project.stop();
      } catch (e) {
        // ignore
      }
      this._project = null;
    }
    this.log.info('Franklin project stopped.');
    this.emit('stopped', this);
  }

  async setup() {
    await super.init();
    // check for git repository
    try {
      const stat = await fse.lstat(path.resolve(this.directory, '.git'));
      if (stat.isFile()) {
        throw Error('git submodules are not supported.');
      }
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw Error('hlx up needs local git repository.');
      }
      throw e;
    }

    // init dev default file params
    this._project = new HelixProject()
      .withCwd(this.directory)
      .withLiveReload(this._liveReload)
      .withLogger(this._logger)
      .withKill(this._kill)
      .withPrintIndex(this._printIndex);

    this.log.info(chalk`{yellow     ____              __    ___   v${pkgJson.version}}`);
    this.log.info(chalk`{yellow    / __/______ ____  / /__ / (_)__  }`);
    this.log.info(chalk`{yellow   / _// __/ _ \`/ _ \\/  '_// / / _ \\ }`);
    this.log.info(chalk`{yellow  /_/ /_/  \\_,_/_//_/_/\\_\\/_/_/_//_/ }`);
    this.log.info('');

    const ref = await GitUtils.getBranch(this.directory);
    const gitUrl = await GitUtils.getOriginURL(this.directory, { ref });
    let explicitURL = true;
    if (!this._url) {
      explicitURL = false;
      // check if remote already has the `ref`
      await this.verifyUrl(gitUrl, ref);
    }

    if (this._cache) {
      await fse.ensureDir(this._cache);
      this._project.withCacheDirectory(this._cache);
    }

    if (this._tls) {
      if (
        !this._tlsCertPath
        || !this._tlsKeyPath
      ) {
        throw Error(chalk`{red If using TLS, you must provide both tls cert and tls key...one or both not found }`);
      }

      // this.log.info(chalk`{yellow TLS Enabled...Automatically Switching port to 443`);
      // this._httpPort = 443;

      // read each file
      try {
        const key = await fs.readFile(this._tlsKeyPath);
        const cert = await fs.readFile(this._tlsCertPath);

        this._project.withTLS(key, cert);
      } catch (e) {
        throw Error(chalk`{red Unable to read the tls key key or cert file. }`);
      }
    }

    this._project.withProxyUrl(this._url);
    if (this._httpPort >= 0) {
      this._project.withHttpPort(this._httpPort);
    }

    try {
      await this._project.init();

      if (!explicitURL) {
        this.watchGit();
      }
    } catch (e) {
      throw Error(`Unable to start Franklin: ${e.message}`);
    }
  }

  async verifyUrl(gitUrl, inref) {
    let ref = inref;
    const resp = await fetch(`${gitUrl.raw}/fstab.yaml`);
    await resp.buffer();
    if (!resp.ok) {
      const friendlyUrl = `https://github.com/${gitUrl.owner}/${gitUrl.repo}/tree/${ref}`;
      if (ref === 'main') {
        this.log.warn(chalk`Unable to verify {yellow main} branch on {blue ${friendlyUrl}} (${resp.status}). Maybe not pushed yet?`);
      } else {
        this.log.warn(chalk`Unable to verify {yellow ${ref}} branch on {blue ${friendlyUrl}} (${resp.status}). Fallback to {yellow main} branch.`);
        ref = 'main';
      }
    }
    // replace `/` by `-` in ref.
    ref = ref.replace(/\//g, '-');
    this._url = `https://${ref}--${gitUrl.repo}--${gitUrl.owner}.hlx.page`;
    // check length limit
    if (this._url.split('.')
      .map((part) => part.replace(/^https:\/\//, ''))
      .some((part) => part.length > 63)) {
      this.log.error(chalk`URL {yellow ${this._url}} exceeds the 63 character limit for DNS labels.`);
      this.log.error(chalk`Please use a shorter branch name or a shorter repository name.`);
      this._project.stop();
      throw Error('branch name too long');
    }
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

          // restart if any of the files is not ignored
          this.log.info('git HEAD or remotes changed, reconfiguring server...');
          const ref = await GitUtils.getBranch(this.directory);
          const gitUrl = await GitUtils.getOriginURL(this.directory, { ref });
          await this.verifyUrl(gitUrl, ref);
          this._project.withProxyUrl(this._url);
          this._project.initHeadHtml();
          this.log.info(`Updated proxy to ${this._url}`);
        }, 100);
      }
    });
  }

  async run() {
    await this.setup();
    await this._project.start();
    this.emit('started', this);
    if (this._open) {
      const url = this._open.startsWith('/')
        ? `${this._tls ? 'https' : 'http'}://localhost:${this._project.server.port}${this._open}`
        : this._open;
      opn(url, { url: true });
    }
  }
}
