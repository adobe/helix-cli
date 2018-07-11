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
const yaml = require('js-yaml');
const $ = require('shelljs');
const GitUrl = require('@adobe/petridish/src/GitUrl');
const strainconfig = require('./strain-config');

const STRAIN_FILE = path.resolve(process.cwd(), '.hlx', 'strains.yaml');

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
  }

  static isDirty() {
    return $
      .exec('git status --porcelain', {
        silent: true,
      })
      .stdout.replace(/\n/, '')
      .replace(/[\W]/g, '-').length;
  }

  static getBranch() {
    const rev = $
      .exec('git rev-parse HEAD', {
        silent: true,
      })
      .stdout.replace(/\n/, '')
      .replace(/[\W]/g, '-');

    const tag = $
      .exec(`git name-rev --tags --name-only ${rev}`, {
        silent: true,
      })
      .stdout.replace(/\n/, '')
      .replace(/[\W]/g, '-');

    const branchname = $
      .exec('git rev-parse --abbrev-ref HEAD', {
        silent: true,
      })
      .stdout.replace(/\n/, '')
      .replace(/[\W]/g, '-');

    return tag !== 'undefined' ? tag : branchname;
  }

  static getBranchFlag() {
    return DeployCommand.isDirty() ? 'dirty' : DeployCommand.getBranch();
  }

  static getRepository() {
    return $
      .exec('git config --get remote.origin.url', {
        silent: true,
      })
      .stdout.replace(/\n/, '')
      .replace(/[\W]/g, '-');
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
    }).stdout.replace(/\n/, '');
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

    const owoptions = {
      apihost: this._wsk_host,
      api_key: this._wsk_auth,
      namespace: this._wsk_namespace,
    };
    const openwhisk = ow(owoptions);

    const scripts = glob.sync(`${this._target}/*.js`);

    const params = {
      ...this._default,
      LOGGLY_HOST: this._loggly_host,
      LOGGLY_KEY: this._loggly_auth,
    };

    if (!this._prefix) {
      this._prefix = `${DeployCommand.getRepository()}--${DeployCommand.getBranchFlag()}--`;
    }

    scripts.map((script) => {
      const name = this._prefix + path.basename(script, '.js');
      console.log(`⏳  Deploying ${script} as ${name}`);

      fs.readFile(script, { encoding: 'utf8' }, (err, action) => {
        if (!err) {
          const actionoptions = {
            name,
            action,
            params,
            kind: 'blackbox',
            exec: { image: this._docker, main: 'module.exports.main' },
            annotations: { 'web-export': true },
          };
          if (this._dryRun) {
            console.log(`❎  Action ${name} has been skipped.`);
          } else {
            openwhisk.actions.update(actionoptions).then((result) => {
              console.log(`✅  Action ${result.name} has been created.`);
            });
          }
        } else {
          console.err(`❌  File ${script} could not be read. ${err.message}`);
        }
      });

      return name;
    });

    const giturl = new GitUrl(this._content);
    if (fs.existsSync(STRAIN_FILE)) {
      const oldstrains = strainconfig.load(fs.readFileSync(STRAIN_FILE));
      const strain = {
        code: `/${this._wsk_namespace}/${this._prefix}`,
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
          STRAIN_FILE,
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
      fs.writeFileSync(STRAIN_FILE, strainconfig.write([defaultstrain]));
    }

    return this;
  }
}
module.exports = DeployCommand;
