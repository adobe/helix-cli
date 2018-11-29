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
const archiver = require('archiver');
const { GitUrl, GitUtils } = require('@adobe/helix-shared');
const useragent = require('./user-agent-util');
const AbstractCommand = require('./abstract.cmd.js');
const packageCfg = require('./parcel/packager-config.js');
const ExternalsCollector = require('./parcel/ExternalsCollector.js');

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
    this._target = path.resolve(this.directory, this._target);
  }

  /**
   * Creates a .zip package that contains the contents to be deployed to openwhisk.
   * @param info The action info object
   * @param info.name Name of the action
   * @param info.main Main script of the action
   * @param info.externals External modules
   * @param info.requires Local dependencies
   * @param bar progress bar
   * @returns {Promise<any>} Promise that resolves to the package file {@code path}.
   */
  async createPackage(info, bar) {
    const { log } = this;

    const ticks = {};
    const tick = (message, name) => {
      const shortname = name.replace(/\/package.json.*/, '').replace(/node_modules\//, '');
      bar.tick({
        action: name ? `packaging ${shortname}` : '',
      });
      if (message) {
        this.log.maybe({
          progress: true,
          level: 'info',
          message,
        });
      }
    };

    return new Promise((resolve, reject) => {
      const archiveName = `${info.name}.zip`;
      const zipFile = path.resolve(this._target, archiveName);
      let hadErrors = false;

      // create zip file for package
      const output = fs.createWriteStream(zipFile);
      const archive = archiver('zip');

      log.debug(`preparing package ${archiveName}`);
      output.on('close', () => {
        if (!hadErrors) {
          log.debug(`${archiveName}: Created package. ${archive.pointer()} total bytes`);
          // eslint-disable-next-line no-param-reassign
          info.zipFile = zipFile;
          resolve(info);
        }
      });
      archive.on('entry', (data) => {
        log.debug(`${archiveName}: A ${data.name}`);
        if (ticks[data.name]) {
          tick('', data.name);
        }
      });
      archive.on('warning', (err) => {
        log.error(`${chalk.redBright('[error] ')}Unable to create archive: ${err.message}`);
        hadErrors = true;
        reject(err);
      });
      archive.on('error', (err) => {
        log.error(`${chalk.redBright('[error] ')}Unable to create archive: ${err.message}`);
        hadErrors = true;
        reject(err);
      });

      const packageJson = {
        name: info.name,
        version: '1.0',
        description: `Lambda function of ${info.name}`,
        main: path.basename(info.main),
        license: 'Apache-2.0',
      };

      archive.pipe(output);
      archive.append(JSON.stringify(packageJson, null, '  '), { name: 'package.json' });

      info.files.forEach((file) => {
        const name = path.basename(file);
        archive.file(path.resolve(this._target, file), { name });
        ticks[name] = true;
      });

      // add modules that cause problems when embeded in webpack
      Object.keys(info.externals).forEach((mod) => {
        archive.directory(info.externals[mod], `node_modules/${mod}`);
        ticks[`node_modules/${mod}/package.json`] = true;
      });

      archive.finalize();
    });
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

    // get the list of scripts from the info files
    const infos = [...glob.sync(`${this._target}/*.info.json`)];
    const scriptInfos = {};
    (await Promise.all(infos.map(info => fs.readJSON(info))))
      .forEach((info) => {
        scriptInfos[info.main] = info;
      });

    // remove dependencies
    Object.keys(scriptInfos).forEach((key) => {
      const script = scriptInfos[key];
      if (script) {
        script.requires.forEach((dep) => {
          delete scriptInfos[dep];
        });
      }
    });

    const scripts = Object.values(scriptInfos);

    // add static action
    scripts.push({
      main: path.resolve(__dirname, 'openwhisk', 'static.js'),
      requires: [],
    });

    const bar = new ProgressBar('[:bar] :action :etas', {
      total: scripts.length,
      width: 50,
      renderThrottle: 1,
      stream: process.stdout,
    });

    // collect all the external modules of the scripts
    let steps = 0;
    await Promise.all(scripts.map(async (script) => {
      const collector = new ExternalsCollector()
        .withDirectory(this._target)
        .withExternals(Object.keys(packageCfg.externals));

      // eslint-disable-next-line no-param-reassign
      script.files = [script.main, ...script.requires].map(f => path.resolve(this._target, f));
      // eslint-disable-next-line no-param-reassign
      script.externals = await collector.collectModules(script.files);
      steps += Object.keys(script.externals).length + script.files.length;
      bar.tick(1, {
        action: `analyzing ${path.basename(script.main)}`,
      });
    }));

    // trigger new progress bar
    bar.total += steps;

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

    if (!this._prefix) {
      this._prefix = `${GitUtils.getRepository()}--${GitUtils.getBranchFlag()}--`;
    }

    // generate action names
    scripts.forEach((script) => {
      // eslint-disable-next-line no-param-reassign
      script.name = this.actionName(script.main);
    });

    // package actions
    await Promise.all(scripts.map(script => this.createPackage(script, bar)));

    // read files ...
    const read = scripts.map(script => fs.readFile(script.zipFile)
      .then(action => ({ script, action })));

    // ... and deploy
    bar.total += scripts.length * 2;
    const deployed = read.map(p => p.then(({ script, action }) => {
      const actionoptions = {
        name: script.name,
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
