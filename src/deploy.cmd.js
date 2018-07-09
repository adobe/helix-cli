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
const fs = require('fs');
const $ = require('shelljs');

class DeployCommand {
  constructor() {
    this._enableAuto = true;
    this._apikey = null;
    this._namespace = null;
    this._apihost = null;
    this._loghost = null;
    this._logkey = null;
    this._target = null;
    this._docker = null;
    this._prefix = null;
    this._default = null;
    this._enableDirty = false;
  }

  static isDirty() {
    return $
      .exec('git status --porcelain', {
        silent: true,
      })
      .stdout.replace(/\n/, '')
      .replace(/[\W]/g, '-')
      .length;
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

  withEnableAuto(value) {
    this._enableAuto = value;
    return this;
  }

  withApihost(value) {
    this._apihost = value;
    return this;
  }

  withApikey(value) {
    this._apikey = value;
    return this;
  }

  withNamespace(value) {
    this._namespace = value;
    return this;
  }

  withLoghost(value) {
    this._loghost = value;
    return this;
  }

  withLogkey(value) {
    this._logkey = value;
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

    const owoptions = { apihost: this._apihost, api_key: this._apikey, namespace: this._namespace };
    const openwhisk = ow(owoptions);

    const scripts = glob.sync(`${this._target}/*.js`);

    const params = { ...this._default, LOGGLY_HOST: this._loghost, LOGGLY_KEY: this._logkey };

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
          // console.log(actionoptions)
          openwhisk.actions.update(actionoptions).then((result) => {
            console.log(`✅  Action ${result.name} has been created.`);
          });
        }
      });

      return name;
    });
    return this;
  }
}
module.exports = DeployCommand;
