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

/* eslint no-console: off */

'use strict';

const request = require('request-promise-native');
const chalk = require('chalk');
const ow = require('openwhisk');
const glob = require('glob');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const yaml = require('js-yaml');
const archiver = require('archiver');
const GitUrl = require('@adobe/petridish/src/GitUrl');
const GitUtils = require('./gitutils');
const strainconfig = require('./strain-config-utils');
const GithubDistributor = require('./distributor/github');
const DefaultDistributor = require('./distributor/default');

const DISTRIBUTORS = {
  none: DefaultDistributor,
  bundled: DefaultDistributor,
  github: GithubDistributor,
};

class DeployCommand {
  constructor() {
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
    this._content = null;
    this._distDir = null;
    this._staticContent = null;
    this._strainFile = path.resolve(process.cwd(), '.hlx', 'strains.yaml');
  }


  static getDefaultContentURL() {
    if (fs.existsSync('helix-config.yaml')) {
      const conf = yaml.safeLoad(fs.readFileSync('helix-config.yaml'));
      if (conf.contentRepo) {
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

  withStaticContent(value) {
    this._staticContent = value;
    return this;
  }

  withStrainFile(value) {
    this._strainFile = value;
    return this;
  }

  /**
   * Creates a .zip package that contains the contents to be deployed to openwhisk.
   * @param script Filename of the main script file.
   * @returns {Promise<any>} an object containing the action {@code name} and package file
   *                         {@code path}.
   */
  async createPackage(script) {
    return new Promise((resolve, reject) => {
      const baseName = path.basename(script, '.js');
      const name = this._prefix + baseName;
      const zipFile = path.resolve(this._target, `${name}.zip`);
      let hadErrors = false;

      // create zip file for package
      const output = fs.createWriteStream(zipFile);
      const archive = archiver('zip');

      console.log('⏳  preparing package %s: ', zipFile);
      output.on('close', () => {
        if (!hadErrors) {
          console.log('    %d total bytes', archive.pointer());
          resolve({
            name,
            path: zipFile,
          });
        }
      });
      archive.on('entry', (data) => {
        console.log('    - %s', data.name);
      });
      archive.on('warning', (err) => {
        console.log(`${chalk.redBright('[error] ')}File ${script} could not be read. ${err.message}`);
        hadErrors = true;
        reject(err);
      });
      archive.on('error', (err) => {
        console.log(`${chalk.redBright('[error] ')}File ${script} could not be read. ${err.message}`);
        hadErrors = true;
        reject(err);
      });

      const packageJson = {
        name,
        version: '1.0',
        description: `Lambda function of ${name}`,
        main: 'main.js',
        license: 'Apache-2.0',
      };

      archive.pipe(output);
      archive.file(script, { name: 'main.js' });
      if (this._staticContent === 'bundled' && baseName === 'html') {
        archive.directory(this._distDir, 'dist');
        archive.file(path.resolve(__dirname, 'openwhisk/server.js'), { name: 'server.js' });
        packageJson.main = 'server.js';
      }

      archive.append(JSON.stringify(packageJson, null, '  '), { name: 'package.json' });
      archive.finalize();
    });
  }

  async autoDeploy() {
    const { owner, repo } = GitUtils.getOriginURL();

    const auth = {
      username: this._circleciAuth,
      password: '',
    };

    const followoptions = {
      method: 'POST',
      json: true,
      auth,
      uri: `https://circleci.com/api/v1.1/project/github/${owner}/${repo}/follow`,
    };

    console.log(`Automating deployment with ${followoptions.uri}`);
    const follow = await request(followoptions);

    if (follow.first_build) {
      console.log('Auto-deployment started. Configuring: ');
    } else {
      console.log('\nAuto-deployment already set up. Go to');
      console.log(`${chalk.grey(`https://circleci.com/gh/${owner}/${repo}`)} for build status or`);
      console.log(`${chalk.grey(`https://circleci.com/gh/${owner}/${repo}/edit`)} for build settings`);
    }
  }

  async run() {
    const dirty = GitUtils.isDirty();
    if (dirty && !this._enableDirty) {
      console.error('hlx will not deploy a working copy that has uncommitted changes. Re-run with flag --dirty to force.');
      process.exit(dirty);
    }

    if (this._enableAuto) {
      return this.autoDeploy();
    }

    const giturl = new GitUrl(this._content);

    const owoptions = {
      apihost: this._wsk_host,
      api_key: this._wsk_auth,
      namespace: this._wsk_namespace,
    };
    const openwhisk = ow(owoptions);

    const params = {
      ...this._default,
      LOGGLY_HOST: this._loggly_host,
      LOGGLY_KEY: this._loggly_auth,
    };

    if (!this._prefix) {
      this._prefix = `${GitUtils.getRepository()}--${GitUtils.getBranchFlag()}--`;
    }

    if (!this._distDir) {
      this._distDir = path.resolve(path.dirname(this._target), 'dist');
    }

    const Disty = DISTRIBUTORS[this._staticContent];
    if (!Disty) {
      throw Error(`Static content distribution "${this._staticContent}" not implemented yet.`);
    }
    this._distributor = await new Disty()
      .withHelixDir(path.dirname(this._target))
      .withDistDir(this._distDir)
      .withPrefix(this._prefix)
      .withDryRun(this._dryRun)
      .init();

    // todo: how to handle different "components" ?
    const scripts = glob.sync(`${this._target}/*.js`);
    await Promise.all(scripts.map(async (script) => {
      const info = await this.createPackage(script);

      console.log(`⏳  Deploying ${path.basename(info.path)} as ${info.name}`);
      const action = await fs.readFile(info.path);
      const actionoptions = {
        name: info.name,
        action,
        params,
        kind: 'blackbox',
        exec: {
          image: this._docker,
        },
        annotations: { 'web-export': true },
      };
      if (this._dryRun) {
        console.log(`❎  Action ${info.name} has been skipped (dry-run).`);
      } else {
        openwhisk.actions.update(actionoptions).then((result) => {
          console.log(`✅  Action ${result.name} has been created.`);
          console.log('\nYou can verify the action with:');
          console.log(chalk.grey(`$ curl "https://${this._wsk_host}/api/v1/web/${this._wsk_namespace}/default/${info.name}?path=index.md&owner=${giturl.owner}&repo=${giturl.repo}&ref=${giturl.ref}"`));
        });
      }
    }));

    // run distributor
    await this._distributor.run();

    if (fs.existsSync(this._strainFile)) {
      const oldstrains = strainconfig.load(fs.readFileSync(this._strainFile));
      const strain = {
        code: `/${this._wsk_namespace}/default/${this._prefix}`,
        content: {
          repo: giturl.repo,
          ref: giturl.ref,
          owner: giturl.owner,
        },
      };
      this._distributor.processStrain(strain);
      const newstrains = strainconfig.append(oldstrains, strain);
      if (newstrains.length > oldstrains.length) {
        console.log(`Updating strain config, adding strain ${strainconfig.name(strain)} as configuration has changed`);
        fs.writeFileSync(
          this._strainFile,
          strainconfig.write(newstrains),
        );
      }
    } else {
      console.log('Generating new strain config');
      const defaultstrain = {
        name: 'default',
        code: `/${this._wsk_namespace}/${this._prefix}`,
        content: {
          repo: giturl.repo,
          ref: giturl.ref,
          owner: giturl.owner,
        },
      };
      this._distributor.processStrain(defaultstrain);
      await fs.ensureDir(path.dirname(this._strainFile));
      fs.writeFileSync(this._strainFile, strainconfig.write([defaultstrain]));
    }

    return this;
  }
}
module.exports = DeployCommand;
