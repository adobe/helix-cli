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

const ow = require('openwhisk');
const glob = require('glob');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const yaml = require('js-yaml');
const $ = require('shelljs');
const archiver = require('archiver');
const GitUrl = require('@adobe/petridish/src/GitUrl');
const strainconfig = require('./strain-config-utils');

class DeployCommand {
  constructor() {
    this._enableAuto = true;
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

  static isDirty() {
    return $
      .exec('git status --porcelain', {
        silent: true,
      })
      .stdout.replace(/\n/g, '')
      .replace(/[\W]/g, '-').length;
  }

  static getBranch() {
    const rev = $
      .exec('git rev-parse HEAD', {
        silent: true,
      })
      .stdout.replace(/\n/g, '')
      .replace(/[\W]/g, '-');

    const tag = $
      .exec(`git name-rev --tags --name-only ${rev}`, {
        silent: true,
      })
      .stdout.replace(/\n/g, '')
      .replace(/[\W]/g, '-');

    const branchname = $
      .exec('git rev-parse --abbrev-ref HEAD', {
        silent: true,
      })
      .stdout.replace(/\n/g, '')
      .replace(/[\W]/g, '-');

    return tag !== 'undefined' ? tag : branchname;
  }

  static getBranchFlag() {
    return DeployCommand.isDirty() ? 'dirty' : DeployCommand.getBranch();
  }

  static getRepository() {
    const repo = $
      .exec('git config --get remote.origin.url', {
        silent: true,
      })
      .stdout.replace(/\n/g, '')
      .replace(/[\W]/g, '-');
    if (repo !== '') {
      return repo;
    }
    return `local--${path.basename(process.cwd())}`;
  }

  static getDefaultContentURL() {
    if (fs.existsSync('helix-config.yaml')) {
      const conf = yaml.safeLoad(fs.readFileSync('helix-config.yaml'));
      if (conf.contentRepo) {
        return conf.contentRepo;
      }
    }
    const giturl = $.exec('git config --get remote.origin.url', {
      silent: true,
    }).stdout.replace(/\n/g, '');
    return giturl;
  }

  withEnableAuto(value) {
    this._enableAuto = value;
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

  async run() {
    if (this._enableAuto) {
      console.error('Auto-deployment not implemented yet, please try hlx deploy --no-auto');
      process.exit(1);
    }

    const dirty = DeployCommand.isDirty();
    if (dirty && !this._enableDirty) {
      console.error('hlx will not deploy a working copy that has uncommitted changes. Re-run with flag --dirty to force.');
      process.exit(dirty);
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
      this._prefix = `${DeployCommand.getRepository()}--${DeployCommand.getBranchFlag()}--`;
    }

    if (!this._distDir) {
      this._distDir = path.resolve(path.dirname(this._target), 'dist');
    }

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
          console.log(`$ wsk action invoke -r --blocking ${info.name} -p owner ${giturl.owner} -p repo ${giturl.repo} -p ref ${giturl.ref} -p path /index.md`);
        });
      }
    }));

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
      await fs.ensureDir(path.dirname(this._strainFile));
      fs.writeFileSync(this._strainFile, strainconfig.write([defaultstrain]));
    }

    return this;
  }
}
module.exports = DeployCommand;
