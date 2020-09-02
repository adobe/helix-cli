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

const path = require('path');
const fse = require('fs-extra');
const opn = require('open');
const chokidar = require('chokidar');
const chalk = require('chalk');
const { HelixProject } = require('@adobe/helix-simulator');
const { GitUrl } = require('@adobe/helix-shared');
const GitUtils = require('./git-utils.js');
const BuildCommand = require('./build.cmd');
const pkgJson = require('../package.json');

const HELIX_CONFIG = 'helix-config.yaml';
const HELIX_QUERY = 'helix-query.yaml';
const GIT_HEAD = '.git/HEAD';

class UpCommand extends BuildCommand {
  constructor(logger) {
    super(logger);
    this._httpPort = -1;
    this._open = false;
    this._liveReload = false;
    this._saveConfig = false;
    this._overrideHost = null;
    this._localRepos = [];
    this._devDefault = {};
    this._devDefaultFile = () => ({});
    this._githubToken = '';
    this._algoliaAppID = null;
    this._algoliaAPIKey = null;
  }

  withHttpPort(p) {
    this._httpPort = p;
    return this;
  }

  withOpen(o) {
    this._open = !!o;
    return this;
  }

  withLiveReload(value) {
    this._liveReload = value;
    return this;
  }

  withSaveConfig(value) {
    this._saveConfig = value;
    return this;
  }

  withOverrideHost(value) {
    this._overrideHost = value;
    return this;
  }

  withLocalRepo(value = []) {
    if (Array.isArray(value)) {
      this._localRepos.push(...value.filter((r) => !!r));
    } else if (value) {
      this._localRepos.push(value);
    }
    return this;
  }

  withHelixPagesRepo(url) {
    this._helixPagesRepo = url;
    return this;
  }

  withDevDefault(value) {
    this._devDefault = value;
    return this;
  }

  withDevDefaultFile(value) {
    this._devDefaultFile = value;
    return this;
  }

  withGithubToken(value) {
    this._githubToken = value;
    return this;
  }

  withAlgoliaAppID(value) {
    this._algoliaAppID = value;
    return this;
  }

  withAlgoliaAPIKey(value) {
    this._algoliaAPIKey = value;
    return this;
  }

  get project() {
    return this._project;
  }

  async stop() {
    if (this._watcher) {
      await this._watcher.close();
      this._watcher = null;
    }
    if (this._project) {
      try {
        await this._project.stop();
      } catch (e) {
        // ignore
      }
      this._project = null;
    }
    this.log.info('Helix project stopped.');
    this.emit('stopped', this);
  }

  /**
   * Sets up the source file watcher.
   * @private
   */
  _initSourceWatcher(fn) {
    let timer = null;
    let modifiedFiles = {};

    this._watcher = chokidar.watch([
      'src', 'cgi-bin', '.hlx/pages/master/src', '.hlx/pages/master/cgi-bin',
      HELIX_CONFIG, HELIX_QUERY, GIT_HEAD,
    ], {
      ignored: /(.*\.swx|.*\.swp|.*~)/,
      persistent: true,
      ignoreInitial: true,
      cwd: this.directory,
    });

    this._watcher.on('all', (eventType, file) => {
      modifiedFiles[file] = true;
      if (timer) {
        clearTimeout(timer);
      }
      // debounce a bit in case several files are changed at once
      timer = setTimeout(async () => {
        timer = null;
        const files = modifiedFiles;
        modifiedFiles = {};
        await fn(files);
      }, 250);
    });
  }

  async setup() {
    await super.init();
    // check for git repository
    if (!await fse.pathExists(path.join(this.directory, '.git'))) {
      throw Error('hlx up needs local git repository.');
    }
    // init dev default file params
    this._devDefault = Object.assign(this._devDefaultFile(this.directory), this._devDefault);

    let hasConfigFile = await this.config.hasFile();
    if (this._saveConfig) {
      if (hasConfigFile) {
        this.log.warn(chalk`Cowardly refusing to overwrite existing {cyan helix-config.yaml}.`);
      } else {
        await this.config.saveConfig();
        this.log.info(chalk`Wrote new default config to {cyan ${path.relative(process.cwd(), this.config.configPath)}}.`);
        hasConfigFile = true;
      }
    }

    // check for git repository
    if (!hasConfigFile && this._localRepos.length === 0) {
      if (!this.config.strains.get('default').content.isLocal) {
        // ensure local repository will be mounted for default config with origin
        this._localRepos.push('.');
      }
    }

    // check all local repos
    const localRepos = (await Promise.all(this._localRepos.map(async (repo) => {
      const repoPath = path.resolve(this.directory, repo);
      if (!await fse.pathExists(path.join(repoPath, '.git'))) {
        throw Error(`Specified --local-repo=${repo} is not a git repository.`);
      }
      const gitUrl = await GitUtils.getOriginURL(repoPath);
      if (!gitUrl) {
        if (repoPath !== this.directory) {
          this.log.warn(`Ignoring --local-repo=${repo}. No remote 'origin' defined.`);
        }
        return null;
      }
      return {
        gitUrl,
        repoPath,
      };
    }))).filter((e) => !!e);

    // add github token to action params
    if (this._githubToken && !this._devDefault.GITHUB_TOKEN) {
      this._devDefault.GITHUB_TOKEN = this._githubToken;
    }

    // algolia default credentials
    const ALGOLIA_APP_ID = 'A8PL9E4TZT';
    const ALGOLIA_API_KEY = '3934d5173a5fedf1cb7c619a6a26f300';

    this._project = new HelixProject()
      .withCwd(this.directory)
      .withBuildDir(this._target)
      .withHelixConfig(this.config)
      .withIndexConfig(this.indexConfig)
      .withAlgoliaAppID(this._algoliaAppID || ALGOLIA_APP_ID)
      .withAlgoliaAPIKey(this._algoliaAPIKey || ALGOLIA_API_KEY)
      .withActionParams(this._devDefault)
      .withLiveReload(this._liveReload)
      .withRuntimeModulePaths(module.paths);

    // special handling for helix pages project
    if (await this.helixPages.isPagesProject()) {
      this.log.info('    __ __    ___       ___                  ');
      this.log.info('   / // /__ / (_)_ __ / _ \\___ ____ ____ ___');
      this.log.info('  / _  / -_) / /\\ \\ // ___/ _ `/ _ `/ -_|_-<');
      this.log.info(' /_//_/\\__/_/_//_\\_\\/_/   \\_,_/\\_, /\\__/___/');
      this.log.info(`                              /___/ v${pkgJson.version}`);
      this.log.info('');

      // use bundled helix-pages sources
      this._project.withSourceDir(this.helixPages.srcDirectory);

      // local branch should be considered as default for pages project
      const ref = await GitUtils.getBranch(this.directory);
      const defaultStrain = this.config.strains.get('default');
      defaultStrain.content = new GitUrl({
        ...defaultStrain.content.toJSON(),
        ref,
      });

      // use bundled helix-pages htdocs
      if (!await fse.pathExists(path.join(this.directory, 'htdocs'))) {
        defaultStrain.static.url = this.helixPages.staticURL;
        localRepos.push({
          repoPath: this.helixPages.checkoutDirectory,
          gitUrl: this.helixPages.staticURL,
        });
      }
    } else {
      this.log.info('    __ __    ___         ');
      this.log.info('   / // /__ / (_)_ __    ');
      this.log.info('  / _  / -_) / /\\ \\ / ');
      this.log.info(` /_//_/\\__/_/_//_\\_\\ v${pkgJson.version}`);
      this.log.info('                         ');
      this._project.withSourceDir(path.resolve(this._sourceRoot, 'src'));
      this._project.withSourceDir(path.resolve(this._sourceRoot, 'cgi-bin'));
    }

    // start debugger (#178)
    // https://nodejs.org/en/docs/guides/debugging-getting-started/#enable-inspector
    if (process.platform !== 'win32') {
      process.kill(process.pid, 'SIGUSR1');
    }

    if (this._httpPort >= 0) {
      this._project.withHttpPort(this._httpPort);
    }
    if (this._overrideHost) {
      this._project.withRequestOverride({
        headers: {
          host: this._overrideHost,
        },
      });
    }

    try {
      await this._project.init();
    } catch (e) {
      throw Error(`Unable to start helix: ${e.message}`);
    }

    // register the local repositories
    localRepos.forEach((repo) => {
      this._project.registerGitRepository(repo.repoPath, repo.gitUrl);
    });
  }

  async run() {
    await this.setup();
    let buildStartTime;
    let buildMessage;
    const onBuildStart = async () => {
      if (this._project.started) {
        buildMessage = 'Rebuilding project files...';
      } else {
        buildMessage = 'Building project files...';
      }
      this.log.info(buildMessage);
      buildStartTime = Date.now();
    };

    const onBuildEnd = async () => {
      try {
        const buildTime = Date.now() - buildStartTime;
        this.log.info(`${buildMessage}done ${buildTime}ms`);
        if (this._project.started) {
          this.emit('build', this);
          this._project.invalidateCache();
          return;
        }

        // ensure correct module paths
        this._project.withRuntimeModulePaths([...this.modulePaths, ...module.paths]);

        await this._project.start();

        // init source watcher after everything is built
        this._initSourceWatcher(async (files) => {
          const dirtyConfigFiles = Object.keys(files || {})
            .filter((f) => f === HELIX_CONFIG || f === HELIX_QUERY || f === GIT_HEAD);
          if (dirtyConfigFiles.length) {
            this.log.info(`${dirtyConfigFiles.join(', ')} modified. Restarting dev server...`);
            await this._project.stop();
            await this.reloadConfig();
            await this.setup();
            // ensure correct module paths
            this._project.withRuntimeModulePaths([...this.modulePaths, ...module.paths]);
            await this._project.start();
            if (Object.keys(files).length === 1) {
              return Promise.resolve();
            }
          }
          return this.build();
        });

        this.emit('started', this);
        if (this._open) {
          opn(`http://localhost:${this._project.server.port}/`, { url: true });
        }
        if (!await this.config.hasFile() && !await this.helixPages.isPagesProject()) {
          this.log.info(chalk`{green Note:} 
The project does not have a {cyan helix-config.yaml} which is necessary to 
access remote content and to deploy helix. Consider running 
{gray hlx up --save-config} to generate a default config.`);
        }
      } catch (e) {
        this.log.error(`Error: ${e.message}`);
        await this.stop();
      }
    };

    this.on('buildStart', onBuildStart);
    this.on('buildEnd', onBuildEnd);

    this.build();
  }
}

module.exports = UpCommand;
