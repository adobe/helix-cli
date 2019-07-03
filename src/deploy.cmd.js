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
const { HelixConfig, GitUrl } = require('@adobe/helix-shared');
const GitUtils = require('./git-utils');
const useragent = require('./user-agent-util');
const AbstractCommand = require('./abstract.cmd.js');
const PackageCommand = require('./package.cmd.js');
const ConfigUtils = require('./config/config-utils.js');

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
    this._prefix = null;
    this._default = null;
    this._enableDirty = false;
    this._dryRun = false;
    this._createPackages = 'auto';
    this._addStrain = null;
    this._enableMinify = false;
    this._resolveGitRefSvc = 'helix-services/resolve-git-ref@v1';
  }

  get requireConfigFile() {
    return this._addStrain === null;
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

  withCreatePackages(value) {
    this._createPackages = value;
    return this;
  }

  withAddStrain(value) {
    this._addStrain = value === undefined ? null : value;
    return this;
  }

  withMinify(value) {
    this._enableMinify = value;
    return this;
  }

  withResolveGitRefService(value) {
    this._resolveGitRefSvc = value;
    return this;
  }

  actionName(script) {
    if (script.main.indexOf(path.resolve(__dirname, 'openwhisk')) === 0) {
      return `hlx--${script.name}`;
    }
    if (script.main.match(/cgi-bin\//)) {
      return `${this._prefix}/cgi-bin-${script.name}`;
    }
    return `${this._prefix}/${script.name}`;
  }

  async init() {
    await super.init();
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

    const { owner, repo, ref } = await GitUtils.getOriginURL(this.directory);

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
    const origin = await GitUtils.getOrigin(this.directory);
    if (!origin) {
      throw Error('hlx cannot deploy without a remote git repository. Add one with\n$ git remote add origin <github_repo_url>.git');
    }
    const dirty = await GitUtils.isDirty(this.directory);
    if (dirty && !this._enableDirty) {
      throw Error('hlx will not deploy a working copy that has uncommitted changes. Re-run with flag --dirty to force.');
    }
    if (this._enableAuto) {
      return this.autoDeploy();
    }

    // get git coordinates and list affected strains
    const ref = await GitUtils.getBranch(this.directory);
    const giturl = new GitUrl(`${origin}#${ref}`);
    const affected = this.config.strains.filterByCode(giturl);
    if (affected.length === 0) {
      let newStrain = this._addStrain ? this.config.strains.get(this._addStrain) : null;
      if (!newStrain) {
        newStrain = this.config.strains.get('default');
        // if default is proxy, fall back to default default
        if (newStrain.isProxy()) {
          const hlx = await new HelixConfig()
            .withSource(await ConfigUtils.createDefaultConfig(this.directory))
            .init();
          newStrain = hlx.strains.get('default');
        }
        newStrain = newStrain.clone();
        newStrain.name = this._addStrain || uuidv4();
        this.config.strains.add(newStrain);
      }

      newStrain.code = giturl;
      // also tweak content and static url, if default is still local
      if (newStrain.content.isLocal) {
        newStrain.content = giturl;
      }
      if (newStrain.static.url.isLocal) {
        newStrain.static.url = giturl;
      }
      if (this._addStrain === null) {
        this.log.error(chalk`Remote repository {cyan ${giturl}} does not affect any strains.
      
Add a strain definition to your config file:
{grey ${newStrain.toYAML()}}

Alternatively you can auto-add one using the {grey --add <name>} option.`);
        throw Error();
      }

      affected.push(newStrain);
      this.config.modified = true;
      this.log.info(chalk`Updated strain {cyan ${newStrain.name}} in helix-config.yaml`);
    }

    if (dirty) {
      this._prefix = `${giturl.host.replace(/[\W]/g, '-')}--${giturl.owner.replace(/[\W]/g, '-')}--${giturl.repo.replace(/[\W]/g, '-')}--${giturl.ref.replace(/[\W]/g, '-')}-dirty`;
    } else {
      this._prefix = await GitUtils.getCurrentRevision(this.directory);
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
        .withOnlyModified(this._createPackages === 'auto')
        .withMinify(this._enableMinify);
      await pgkCommand.run();
    }

    // get the list of scripts from the info files
    const infos = [...glob.sync(`${this._target}/**/*.info.json`)];
    const scriptInfos = await Promise.all(infos.map(info => fs.readJSON(info)));
    const scripts = scriptInfos
      .filter(script => script.zipFile)
      // generate action names
      .map((script) => {
        // eslint-disable-next-line no-param-reassign
        script.actionName = this.actionName(script);
        return script;
      });

    const bar = new ProgressBar('[:bar] :action :etas', {
      total: (scripts.length * 2) // two ticks for each script
       + 1 // one tick for creating the package
       + 2, // two ticks for binding static
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

    // get API url of resolve action
    if (this._resolveGitRefSvc) {
      params.RESOLVE_GITREF_SERVICE = this._resolveGitRefSvc;
    }

    // create openwhisk package
    if (!this._dryRun) {
      const parameters = Object.keys(params).map((key) => {
        const value = params[key];
        return { key, value };
      });
      await openwhisk.packages.update({
        name: this._prefix,
        package: {
          publish: true,
          parameters,
          annotations: [
            {
              key: 'hlx-code-origin',
              value: giturl.toString(),
            },
          ],
        },
      });
      tick(`created package ${this._prefix}`, '');
    }

    let bindHelixServices;
    // bind helix-services
    if (!this._dryRun) {
      bindHelixServices = openwhisk.packages.update({
        package: {
          binding: {
            namespace: 'helix', // namespace to bind from
            name: 'helix-services', // package to bind from
          },
        },
        name: 'helix-services', // name of the new package
      }).then(() => {
        tick('bound helix-services', '');
      });
    }

    // ... and deploy
    const deployed = read.map(p => p.then(({ script, action }) => {
      const actionoptions = {
        name: script.actionName,
        'User-Agent': useragent,
        action,
        kind: 'nodejs:10',
        annotations: { 'web-export': true },
      };

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
        // eslint-disable-next-line no-param-reassign
        script.error = true;
        tick();
        return false;
      });
    }));

    await Promise.all([...deployed, bindHelixServices]);


    let numErrors = 0;
    let staticactionname = '/hlx--static';
    if (!this._dryRun) {
      // probe Helix Static action for version number
      await request.get('https://adobeioruntime.net/api/v1/web/helix/helix-services/static@latest', {
        resolveWithFullResponse: true,
      }).then((res) => {
        const version = res.headers['x-version'] || 'latest';
        tick(` verified static action version: ${version}`);
        staticactionname = `/helix-services/static@${version}`;
      }).catch((e) => {
        this.log.error(`❌  Unable to verify the static action: ${e.message}`);
        numErrors += 1;
      });
    }

    if (!numErrors && !this._dryRun) {
      await openwhisk.actions.update({
        name: `${this._prefix}/hlx--static`,
        action: {
          namespace: this._wsk_namespace,
          name: 'hlx--static',
          exec: {
            kind: 'sequence',
            components: [this._wsk_namespace + staticactionname],
          },
          annotations: [{
            key: 'exec',
            value: 'sequence',
          }, {
            key: 'web-export',
            value: true,
          }, {
            key: 'raw-http',
            value: false,
          }, {
            key: 'final',
            value: true,
          }],
        },
      }).then(() => {
        tick(` linked static action as sequence ${this._prefix}/hlx--static`);
      }).catch((e) => {
        this.log.error(`❌  Unable to link the static action as a sequence: ${e.message}`);
        numErrors += 1;
      });
    }


    bar.terminate();
    this.log.info(`✅  deployment of ${scripts.length} action${scripts.length !== 1 ? 's' : ''} completed:`);
    scripts.forEach((script) => {
      let status = '';
      if (script.error) {
        status = chalk.red(' (failed)');
        numErrors += 1;
      }
      this.log.info(`   - ${this._wsk_namespace}/${script.actionName} (${humanFileSize(script.archiveSize)})${status}`);
    });

    if (numErrors) {
      this.log.error(`${numErrors} occurred while deploying actions. ${chalk.grey(path.relative(this.directory, this.config.configPath))} not updated.`);
      throw Error();
    }
    // update package in affected strains
    this.log.info(`Affected strains of ${giturl}:`);
    const packageProperty = `${this._wsk_namespace}/${this._prefix}`;
    affected.forEach((strain) => {
      this.log.info(`- ${strain.name}`);
      if (strain.package !== packageProperty) {
        this.config.modified = true;
        // eslint-disable-next-line no-param-reassign
        strain.package = packageProperty;
      }
    });

    if (!this._dryRun && this.config.modified) {
      await this.config.saveConfig();
      this.log.info(`Updated ${path.relative(this.directory, this.config.configPath)}`);
    }
    return this;
  }
}
module.exports = DeployCommand;
