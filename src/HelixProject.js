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

const fs = require('fs-extra');
const util = require('util');
const path = require('path');
const yaml = require('js-yaml');
const _ = require('lodash');
const gitServer = require('@adobe/git-server/lib/server.js');
const GitUrl = require('./GitUrl.js');
const HelixServer = require('./HelixServer.js');
const logger = require('./logger.js');
const packageJson = require('../package.json');

const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);

const HELIX_CONFIG = 'helix-config.yaml';

const INDEX_MD = 'index.md';

const README_MD = 'README.md';

const SRC_DIR = 'src';

const DEFAULT_BUILD_DIR = '.hlx/build';

const DEFAULT_WEB_ROOT = './';

const GIT_DIR = '.git';

const GIT_LOCAL_HOST = '127.0.0.1';

const GIT_LOCAL_OWNER = 'helix';

const GIT_LOCAL_CONTENT_REPO = 'content';

const GIT_SERVER_CONFIG = {
  configPath: '<internal>',
  repoRoot: '.',
  listen: {
    http: {
      port: 0,
      host: '0.0.0.0',
    },
  },

  subdomainMapping: {
    // if enabled, <subdomain>.<baseDomain>/foo/bar/baz will be
    // resolved/mapped to 127.0.0.1/<subdomain>/foo/bar/baz
    enable: true,
    baseDomains: [
      // some wildcarded DNS domains resolving to 127.0.0.1
      'localtest.me',
      'lvh.me',
      'vcap.me',
      'lacolhost.com',
    ],
  },

  // repository mapping. allows to 'mount' repositories outside the 'repoRoot' structure.
  virtualRepos: {
    [GIT_LOCAL_OWNER]: {
    },
  },

  logs: {
    level: 'info',
    logsDir: './logs',
    reqLogFormat: 'short', // used for morgan (request logging)
  },
};

async function isFile(filePath) {
  return stat(filePath).then(stats => stats.isFile()).catch(() => false);
}

async function isDirectory(dirPath) {
  return stat(dirPath).then(stats => stats.isDirectory()).catch(() => false);
}

class HelixProject {
  constructor() {
    this._cwd = process.cwd();
    this._srcDir = '';
    this._indexMd = '';
    this._cfgPath = '';
    this._repoPath = '';
    this._cfg = {};
    this._gitConfig = _.cloneDeep(GIT_SERVER_CONFIG);
    this._gitState = null;
    this._needLocalServer = false;
    this._buildDir = DEFAULT_BUILD_DIR;
    this._webRootDir = DEFAULT_WEB_ROOT;
    this._contentRepo = null;
    this._server = new HelixServer(this);
    this._displayVersion = packageJson.version;
  }

  withCwd(cwd) {
    this._cwd = cwd;
    return this;
  }

  withHttpPort(port) {
    this._server.withPort(port);
    return this;
  }

  withBuildDir(dir) {
    this._buildDir = dir;
    return this;
  }

  withWebRootDir(dir) {
    this._webRootDir = dir;
    return this;
  }

  withDisplayVersion(v) {
    this._displayVersion = v;
    return this;
  }

  get gitConfig() {
    return this._gitConfig;
  }

  get buildDir() {
    return this._buildDir;
  }

  get webRootDir() {
    return this._webRootDir;
  }

  /**
   * Location of the content repo.
   * @returns {null|GitUrl}
   */
  get contentRepo() {
    return this._contentRepo;
  }

  get started() {
    return this._server.isStarted();
  }

  /**
   * Returns the helix server
   * @returns {HelixServer}
   */
  get server() {
    return this._server;
  }

  async loadConfig() {
    const cfgPath = path.resolve(this._cwd, HELIX_CONFIG);
    if (await isFile(cfgPath)) {
      this._cfg = yaml.safeLoad(await readFile(cfgPath, 'utf8')) || {};
    }
  }

  async checkPaths() {
    const idxPath = path.resolve(this._cwd, INDEX_MD);
    if (await isFile(idxPath)) {
      this._indexMd = idxPath;
    }

    const readmePath = path.join(this._cwd, README_MD);
    if (await isFile(readmePath)) {
      this._indexMd = readmePath;
    }

    const srcPath = path.join(this._cwd, SRC_DIR);
    if (await isDirectory(srcPath)) {
      this._srcDir = srcPath;
    }

    this._buildDir = path.resolve(this._cwd, this._buildDir);
    this._webRootDir = path.resolve(this._cwd, this._webRootDir);

    const dotGitPath = path.join(this._cwd, GIT_DIR);
    if (await isDirectory(dotGitPath)) {
      this._repoPath = path.resolve(dotGitPath, '../');
    }
  }

  async init() {
    await this.loadConfig();
    await this.checkPaths();

    const cfg = this._cfg;
    if (!this._srcDir) {
      throw new Error('Invalid config. No "code" location specified and no "src" directory.');
    }

    if (cfg.contentRepo) {
      this._contentRepo = new GitUrl(cfg.contentRepo);
    } else if (this._indexMd) {
      if (!this._repoPath) {
        throw new Error('Local README.md or index.md must be inside a valid git repository.');
      }
      this._gitConfig.virtualRepos[GIT_LOCAL_OWNER][GIT_LOCAL_CONTENT_REPO] = {
        path: this._repoPath,
      };
      this._needLocalServer = true;
    } else {
      throw new Error('Invalid config. No "content" location specified and no "README.md" or "index.md" found.');
    }
    logger.info('    __ __    ___         ');
    logger.info('   / // /__ / (_)_ __    ');
    logger.info('  / _  / -_) / /\\ \\ / ');
    logger.info(` /_//_/\\__/_/_//_\\_\\ v${this._displayVersion}`);
    logger.info('                         ');
    logger.debug('Initialized helix-config with: ');
    logger.debug(` contentRepo: ${this._contentRepo}`);
    logger.debug(`     srcPath: ${this._srcDir}`);
    logger.debug(`    buildDir: ${this._buildDir}`);
    return this;
  }

  async startGitServer() {
    logger.debug('Launching local git server for development...');
    this._gitConfig.logger = logger.getLogger('git');
    this._gitState = await gitServer.start(this._gitConfig);
  }

  async stopGitServer() {
    logger.debug('Stopping local git server..');
    await gitServer.stop();
    this._gitState = null;
  }

  async start() {
    if (this._needLocalServer) {
      await this.startGitServer();
      this._contentRepo = new GitUrl(`http://${GIT_LOCAL_HOST}:${this._gitState.httpPort}/${GIT_LOCAL_OWNER}/${GIT_LOCAL_CONTENT_REPO}`);
    }

    logger.debug('Launching petridish server for development...');
    this._server.init();
    await this._server.start(this);
    return this;
  }

  async stop() {
    logger.debug('Stopping petridish server..');
    await this._server.stop();

    if (this._needLocalServer) {
      await this.stopGitServer();
    }
    return this;
  }
}

module.exports = HelixProject;
