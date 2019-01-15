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

'use strict';

const request = require('request-promise-native');
const chalk = require('chalk');
const ow = require('openwhisk');
const glob = require('glob');
const path = require('path');
const fs = require('fs-extra');
const uuidv4 = require('uuid/v4');
const ProgressBar = require('progress');
const { GitUrl, GitUtils } = require('@adobe/helix-shared');
const useragent = require('./user-agent-util');
const AbstractCommand = require('./abstract.cmd.js');
const PackageCommand = require('./package.cmd.js');

function humanFileSize(size) {
  const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  const p2 = 1024 ** i;
  return `${(size / p2).toFixed(2)} ${['B', 'KiB', 'MiB', 'GiB', 'TiB'][i]}`;
}

class DeployCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._enableAuto = true;
    this._circleciAuth = null;
    this._wsk_auth = null;
    this._wsk_namespace = null;
    this._wsk_host = null;
    this._loggly_host = null;
    this._loggly_auth = null;
    this._fastly_namespace = null;
    this._fastly_auth = null;
    this._target = null;
    this._docker = null;
    this._prefix = null;
    this._default = null;
    this._enableDirty = false;
    this._dryRun = false;
    this._strainFile = null;
    this._createPackages = 'auto';
  }

  withEnableAuto(value) {
    this._enableAuto = value;
    return this;
  }

  withCircleciAuth(value) {
    this._circleciAuth = value;
    return this;
  }

  withFastlyAuth(value) {
    this._fastly_auth = value;
    return this;
  }

  withFastlyNamespace(value) {
    this._fastly_namespace = value;
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

  withLogglyHost(value) {
    this._loggly_host = value;
    return this;
  }

  withLogglyAuth(value) {
    this._loggly_auth = value;
    return this;
  }

  withTarget(value) {
    this._target = value;
    return this;
  }

  withDocker(value) {
    this._docker = value;
    return this;
  }

  withPrefix(value) {
    this._prefix = value;
    return this;
  }

  withDefault(value) {
    this._default = value;
    return this;
  }

  withEnableDirty(value) {
    this._enableDirty = value;
    return this;
  }

  withDryRun(value) {
    this._dryRun = value;
    return this;
  }

  withStrainFile(value) {
    if (!/^.*\.json$/.test(value)) {
      throw Error('non-json strain files are deprecated.');
    }
    this._strainFile = value;
    return this;
  }

  withCreatePackages(value) {
    this._createPackages = value;
    return this;
  }

  actionName(script) {
    if (script.main.indexOf(path.resolve(__dirname, 'openwhisk')) === 0) {
      return `hlx--${script.name}`;
    }
    return this._prefix + script.name;
  }

  async init() {
    await super.init();
    if (!this._strainFile) {
      this._strainFile = path.resolve(this._helixConfig.directory, '.hlx', 'strains.json');
    }
    this._target = path.resolve(this.directory, this._target);
  }

  static getBuildVarOptions(name, value, auth, owner, repo) {
    const body = JSON.stringify({
      name,
      value,
    });
    const options = {
      method: 'POST',
      auth,
      uri: `https://circleci.com/api/v1.1/project/github/${owner}/${repo}/envvar`,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': useragent,
      },
      body,
    };
    return options;
  }

  static setBuildVar(name, value, owner, repo, auth) {
    const options = DeployCommand.getBuildVarOptions(name, value, auth, owner, repo);
    return request(options);
  }

  async autoDeploy() {
    if (!(fs.existsSync(path.resolve(process.cwd(), '.circleci', 'config.yaml')) || fs.existsSync(path.resolve(process.cwd(), '.circleci', 'config.yml')))) {
      throw new Error(`Cannot automate deployment without ${path.resolve(process.cwd(), '.circleci', 'config.yaml')}`);
    }

    const { owner, repo, ref } = GitUtils.getOriginURL();

    const auth = {
      username: this._circleciAuth,
      password: '',
    };

    const followoptions = {
      method: 'POST',
      json: true,
      auth,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': useragent,
      },
      uri: `https://circleci.com/api/v1.1/project/github/${owner}/${repo}/follow`,
    };

    this.log.info(`Automating deployment with ${followoptions.uri}`);

    const follow = await request(followoptions);

    const envars = [];

    if (this._fastly_namespace) {
      envars.push(DeployCommand.setBuildVar('HLX_FASTLY_NAMESPACE', this._fastly_namespace, owner, repo, auth));
    }
    if (this._fastly_auth) {
      envars.push(DeployCommand.setBuildVar('HLX_FASTLY_AUTH', this._fastly_auth, owner, repo, auth));
    }

    if (this._wsk_auth) {
      envars.push(DeployCommand.setBuildVar('HLX_WSK_AUTH', this._wsk_auth, owner, repo, auth));
    }

    if (this._wsk_host) {
      envars.push(DeployCommand.setBuildVar('HLX_WSK_HOST', this._wsk_host, owner, repo, auth));
    }
    if (this._wsk_namespace) {
      envars.push(DeployCommand.setBuildVar('HLX_WSK_NAMESPACE', this._wsk_namespace, owner, repo, auth));
    }
    if (this._loggly_auth) {
      envars.push(DeployCommand.setBuildVar('HLX_LOGGLY_AUTH', this._wsk_auth, owner, repo, auth));
    }
    if (this._loggly_host) {
      envars.push(DeployCommand.setBuildVar('HLX_LOGGLY_HOST', this._loggly_host, owner, repo, auth));
    }

    await Promise.all(envars);

    if (follow.first_build) {
      this.log.info('\nAuto-deployment started.');
      this.log.info('Configuration finished. Go to');
      this.log.info(`${chalk.grey(`https://circleci.com/gh/${owner}/${repo}/edit`)} for build settings or`);
      this.log.info(`${chalk.grey(`https://circleci.com/gh/${owner}/${repo}`)} for build status.`);
    } else {
      this.log.warn('\nAuto-deployment already set up. Triggering a new build.');

      const triggeroptions = {
        method: 'POST',
        json: true,
        auth,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': useragent,
        },
        uri: `https://circleci.com/api/v1.1/project/github/${owner}/${repo}/tree/${ref}`,
      };

      const triggered = await request(triggeroptions);


      this.log.info(`Go to ${chalk.grey(`${triggered.build_url}`)} for build status.`);
    }
  }

  async run() {
    await this.init();
    const origin = GitUtils.getOrigin(this.directory);
    if (!origin) {
      throw Error('hlx cannot deploy without a remote git repository.');
    }
    const dirty = GitUtils.isDirty(this.directory);
    if (dirty && !this._enableDirty) {
      throw Error('hlx will not deploy a working copy that has uncommitted changes. Re-run with flag --dirty to force.');
    }
    if (this._enableAuto) {
      return this.autoDeploy();
    }

    // get git coordinates and list affected strains
    const ref = GitUtils.getBranch(this.directory);
    const giturl = new GitUrl(`${origin}#${ref}`);
    const affected = this.config.strains.filterByCode(giturl);
    if (affected.length === 0) {
      const newStrain = this.config.strains.get('default').clone();
      newStrain.name = uuidv4();
      newStrain.code = giturl;
      this.log.warn(chalk`Remote repository {cyan ${giturl}} does not affect any strains.
      
Add a strain definition to your config file:
{grey ${newStrain.toYAML()}}

Alternatively you can auto-add one using the {grey --add <name>} option.`);
      throw Error();
    }

    this.log.info(`Affected strains of ${giturl}:`);
    affected.forEach((s) => {
      this.log.info(`- ${s.name}`);
    });

    if (!this._prefix) {
      this._prefix = `${giturl.host.replace(/[\W]/g, '-')}-${giturl.owner.replace(/[\W]/g, '-')}-${giturl.repo.replace(/[\W]/g, '-')}--${giturl.ref.replace(/[\W]/g, '-')}${GitUtils.isDirty() ? '-dirty' : ''}--`;
    }

    const owoptions = {
      apihost: this._wsk_host,
      api_key: this._wsk_auth,
      namespace: this._wsk_namespace,
    };
    const openwhisk = ow(owoptions);

    if (this._createPackages !== 'ignore') {
      const pgkCommand = new PackageCommand(this.log)
        .withTarget(this._target)
        .withDirectory(this.directory)
        .withOnlyModified(this._createPackages === 'auto');
      await pgkCommand.run();
    }

    // get the list of scripts from the info files
    const infos = [...glob.sync(`${this._target}/*.info.json`)];
    const scriptInfos = await Promise.all(infos.map(info => fs.readJSON(info)));
    const scripts = scriptInfos.filter(script => script.zipFile);

    // generate action names
    scripts.forEach((script) => {
      // eslint-disable-next-line no-param-reassign
      script.actionName = this.actionName(script);
    });

    const bar = new ProgressBar('[:bar] :action :etas', {
      total: scripts.length * 2,
      width: 50,
      renderThrottle: 1,
      stream: process.stdout,
    });

    const tick = (message, name) => {
      bar.tick({
        action: name ? `deploying ${name}` : '',
      });
      if (message) {
        this.log.log({
          progress: true,
          level: 'info',
          message,
        });
      }
    };

    const params = {
      ...this._default,
      LOGGLY_HOST: this._loggly_host,
      LOGGLY_KEY: this._loggly_auth,
    };

    // read files ...
    const read = scripts
      .filter(script => script.zipFile) // skip empty zip files
      .map(script => fs.readFile(script.zipFile)
        .then(action => ({ script, action })));

    // ... and deploy
    const deployed = read.map(p => p.then(({ script, action }) => {
      const actionoptions = {
        name: script.actionName,
        'User-Agent': useragent,
        action,
        params,
        kind: 'nodejs:10-fat',
        annotations: { 'web-export': true },
      };

      if (this._docker) {
        this.log.warn(`Using docker image ${this._docker} instead of default nodejs:10-fat container.`);
        delete actionoptions.kind;
        actionoptions.exec = {
          image: this._docker,
          main: 'module.exports.main',
        };
      }

      const baseName = path.basename(script.main);
      tick(`deploying ${baseName}`, baseName);

      if (this._dryRun) {
        tick(` deployed ${baseName} (skipped)`);
        return true;
      }

      return openwhisk.actions.update(actionoptions).then(() => {
        tick(` deployed ${baseName} (deployed)`);
        return true;
      }).catch((e) => {
        this.log.error(`❌  Unable to deploy the action ${script.name}:  ${e.message}`);
        tick();
        return false;
      });
    }));

    await Promise.all(deployed);
    bar.terminate();
    this.log.info(`✅  deployment of ${scripts.length} actions completed:`);
    scripts.forEach((script) => {
      this.log.info(`   - ${this._wsk_namespace}/${script.actionName} (${humanFileSize(script.archiveSize)})`);
    });

    // update action in default strain
    // const defaultStrain = this._helixConfig.strains.get('default');
    // defaultStrain.code = `/${this._wsk_namespace}/default/${this._prefix}`;
    // defaultStrain.content = giturl;
    //
    // const newStrains = JSON.stringify(this._helixConfig.strains, null, '  ');
    // const oldStrains = await fs.exists(this._strainFile)
    //     ? await fs.readFile(this._strainFile, 'utf-8') : '';
    //
    // if (oldStrains !== newStrains) {
    //   this.log.info(`Updating strain config in ${path.relative(process.cwd(),
    //   this._strainFile)}`);
    //   await fs.ensureDir(path.dirname(this._strainFile));
    //   await fs.writeFile(this._strainFile, newStrains, 'utf-8');
    // }
    return this;
  }
}
module.exports = DeployCommand;
