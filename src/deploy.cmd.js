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
const yaml = require('js-yaml');
const ProgressBar = require('progress');
const { GitUrl, GitUtils } = require('@adobe/helix-shared');
const useragent = require('./user-agent-util');
const AbstractCommand = require('./abstract.cmd.js');

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
  }

  static getDefaultContentURL() {
    if (fs.existsSync('helix-config.yaml')) {
      const conf = yaml.safeLoad(fs.readFileSync('helix-config.yaml'));
      if (conf && conf.contentRepo) {
        return conf.contentRepo;
      }
    }
    return GitUtils.getOrigin();
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

  withContent(value) {
    this._content = value;
    return this;
  }

  withStrainFile(value) {
    if (!/^.*\.json$/.test(value)) {
      throw Error('non-json strain files are deprecated.');
    }
    this._strainFile = value;
    return this;
  }

  actionName(script) {
    if (script.indexOf(path.resolve(__dirname, 'openwhisk')) === 0) {
      return `hlx--${path.basename(script, '.js')}`;
    }
    return this._prefix + path.basename(script, '.js');
  }

  async init() {
    await super.init();
    if (!this._strainFile) {
      this._strainFile = path.resolve(this._helixConfig.directory, '.hlx', 'strains.json');
    }
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
    const dirty = GitUtils.isDirty();
    if (dirty && !this._enableDirty) {
      this.log.error('hlx will not deploy a working copy that has uncommitted changes. Re-run with flag --dirty to force.');
      process.exit(dirty);
    }

    if (this._enableAuto) {
      return this.autoDeploy();
    }

    // todo: the default should be provided by the helix-config and not the yargs defaults!
    const giturl = new GitUrl(this._content);

    const owoptions = {
      apihost: this._wsk_host,
      api_key: this._wsk_auth,
      namespace: this._wsk_namespace,
    };
    const openwhisk = ow(owoptions);

    const scripts = [path.resolve(__dirname, 'openwhisk', 'static.js'), ...glob.sync(`${this._target}/*.js`)];

    const bar = new ProgressBar('deploying [:bar] :etas', { total: (scripts.length * 2), width: 50, renderThrottle: 1 });

    const tick = (message) => {
      bar.tick();
      this.log.maybe(message);
    };

    const params = {
      ...this._default,
      LOGGLY_HOST: this._loggly_host,
      LOGGLY_KEY: this._loggly_auth,
    };

    if (!this._prefix) {
      this._prefix = `${GitUtils.getRepository()}--${GitUtils.getBranchFlag()}--`;
    }

    const named = scripts.map(script => ({
      script,
      name: this.actionName(script),
    }));

    const read = named.map(({ script, name }) => fs.readFile(script, { encoding: 'utf8' }).then(action => ({ script, name, action })));

    const deployed = read.map(p => p.then(({ script, name, action }) => {
      const actionoptions = {
        name,
        'User-Agent': useragent,
        action,
        params,
        kind: 'blackbox',
        exec: { image: this._docker, main: 'module.exports.main' },
        annotations: { 'web-export': true },
      };

      tick(`deploying ${path.basename(script)}`);

      if (this._dryRun) {
        tick(`️️️skipped ${path.basename(script)} (skipped)`);
        return true;
      }
      return openwhisk.actions.update(actionoptions).then(() => {
        tick(`deployed ${path.basename(script)} (deployed)`);
        return true;
      }).catch((e) => {
        this.log.error(`❌  Unable to deploy the action ${name}:  ${e.message}`);
        bar.tick();
        return false;
      });
    }));

    Promise.all(deployed).then(() => {
      bar.terminate();
      this.log.info('✅  deployment completed');
    });

    // update action in default strain
    const defaultStrain = this._helixConfig.strains.get('default');
    defaultStrain.code = `/${this._wsk_namespace}/default/${this._prefix}`;
    defaultStrain.content = giturl;

    const newStrains = JSON.stringify(this._helixConfig.strains, null, '  ');
    const oldStrains = await fs.exists(this._strainFile) ? await fs.readFile(this._strainFile, 'utf-8') : '';

    if (oldStrains !== newStrains) {
      this.log.info(`Updating strain config in ${path.relative(process.cwd(), this._strainFile)}`);
      await fs.ensureDir(path.dirname(this._strainFile));
      await fs.writeFile(this._strainFile, newStrains, 'utf-8');
    }
    return this;
  }
}
module.exports = DeployCommand;
