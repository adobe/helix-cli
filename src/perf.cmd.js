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

const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const strainconfig = require('./strain-config-utils');

/* eslint-disable no-console */

class PerfCommand {
  constructor() {
    this._strainFile = path.resolve(process.cwd(), '.hlx', 'strains.yaml');
    this._strains = null;
  }

  withStrainFile(value) {
    this._strainFile = value;
    return this;
  }

  loadStrains() {
    if (this._strains) {
      return this._strains;
    }
    const content = fs.readFileSync(this._strainFile);
    this._strains = strainconfig.load(content);
    return this._strains;
  }

  getDefaultParams() {
    const defaultparams = {
      device: 'MotorolaMotoG4',
      location: 'London',
      connection: 'regular3G'
    };

    const defaults = this.loadStrains().filter(({name}) => name === 'default');
    if (defaults.length===1 && defaults.perf) {
      return Object.assign(defaults.perf, defaultparams);
    }
    return defaultparams;
  }

  getStrainParams(strain) {
    if (strain.perf) {
      return Object.assign(strain.perf, this.getDefaultParams());
    }
    return this.getDefaultParams();
  }

  static getURLs(strain) {
    if (strain.url && strain.urls) {
      return [strain.url, ...strain.urls];
    } else if (strain.url) {
      return [strain.url];
    } else if (strain.urls) {
      return strain.urls;
    } else {
      return [];
    }
  }

  async run() {
    console.log(chalk.green('Performance...'));

    this.loadStrains().filter(strain => PerfCommand.getURLs(strain).length).map(strain => {
      console.log(`Testing performance for strain ${strain.name}`);
      PerfCommand.getURLs(strain).map(url => {
        console.log(`  Testing performance for URL ${url}`);
      });
    });
  }
}

module.exports = PerfCommand;
