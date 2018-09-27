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
const _ = require('lodash/fp');
const strainconfig = require('./strain-config-utils');
const JunitPerformanceReport = require('./junit-utils');

/* eslint-disable no-console */

class PerfCommand {
  constructor() {
    this._strainFile = path.resolve(process.cwd(), '.hlx', 'strains.yaml');
    this._strains = null;
    this._auth = null;
    this._calibre = null;
    this._location = 'London';
    this._device = 'MotorolaMotoG4';
    this._connection = 'regular3G';
    this._junit = null;
  }

  withJunit(value) {
    if (value && value !== '') {
      this._junit = new JunitPerformanceReport().withOutfile(path.resolve(process.cwd(), value));
    }
    return this;
  }

  withStrainFile(value) {
    this._strainFile = value;
    return this;
  }

  withCalibreAuth(value) {
    this._auth = value;
    process.env.CALIBRE_API_TOKEN = this._auth;
    // eslint-disable-next-line global-require
    this._calibre = require('calibre'); // defer loading of calibre
    // client until env is set
    return this;
  }

  withLocation(value) {
    this._location = value;
    return this;
  }

  withDevice(value) {
    this._device = value;
    return this;
  }

  withConnection(value) {
    this._connection = value;
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
      device: this._device,
      location: this._location,
      connection: this._connection,
    };

    const defaults = this.loadStrains().filter(
      ({ name }) => name === 'default',
    );
    if (defaults.length === 1 && defaults[0].perf) {
      return Object.assign(defaultparams, defaults[0].perf);
    }
    return defaultparams;
  }

  getStrainParams(strain) {
    if (strain.perf) {
      return Object.assign(this.getDefaultParams(), strain.perf);
    }
    return this.getDefaultParams();
  }

  static getURLs(strain) {
    if (strain.url && strain.urls) {
      return [strain.url, ...strain.urls];
    } if (strain.url) {
      return [strain.url];
    } if (strain.urls) {
      return strain.urls;
    }
    return [];
  }

  static formatScore(score, limit) {
    if (score >= limit) {
      return chalk.green.bold(score);
    }
    return chalk.red.bold(score) + chalk.red(' (failed)');
  }

  static formatMeasure(measure, limit) {
    if (measure <= limit) {
      return chalk.green.bold(measure);
    }
    return chalk.red.bold(measure) + chalk.red(' (failed)');
  }

  /**
   *
   * @param {*} metrics
   * @param {*} name name of the test to run
   * @param {*} limit
   * @returns true if successful, false if unsuccessful and undefined if the name isn't valid
   */
  static format(metrics, name, limit) {
    const metric = metrics.filter(m => m.name === name).length === 1
      ? metrics.filter(m => m.name === name)[0] : null;
    if (metric && metric.name.endsWith('-score')) {
      console.log(`  ${chalk.gray(`${metric.label}: `)}${PerfCommand.formatScore(metric.value, limit)}`);
      return PerfCommand.formatScore(metric.value, limit).indexOf('(failed)') === -1;
    } if (metric) {
      console.log(`  ${chalk.gray(`${metric.label}: `)}${PerfCommand.formatMeasure(metric.value, limit)}`);
      return PerfCommand.formatMeasure(metric.value, limit).indexOf('(failed)') === -1;
    }
    return undefined;
  }

  static formatResponse(response, params = {}, strainname = 'default') {
    console.log(`\nTesting ${response.url} on ${response.device.title} (${response.connection.title}) from ${response.location.emoji}  ${response.location.name} using ${strainname} strain.\n`);
    const strainresults = Object.keys(params).map((key) => {
      const value = params[key];
      if (Number.isInteger(value)) {
        return PerfCommand.format(response.metrics, key, value);
      }
      return undefined;
    });
    if (strainresults.length === 0 || strainresults.every(val => val === undefined)) {
      const perf = PerfCommand.format(response.metrics, 'lighthouse-performance-score', 80);
      const access = PerfCommand.format(response.metrics, 'lighthouse-accessibility-score', 80);
      // use the default metrics
      return perf && access;
    }
    // make sure all tests have been passed
    return strainresults.every(result => result === true || result === undefined);
  }

  async run() {
    console.log(chalk.green('Testing performance…'));

    const tests = this.loadStrains()
      .filter(strain => PerfCommand.getURLs(strain).length)
      .map((strain) => {
        const params = this.getStrainParams(strain);
        return PerfCommand.getURLs(strain).map(url => this._calibre.Test.create({
          url,
          location: params.location,
          device: params.device,
          connection: params.connection,
          cookies: [{
            name: 'X-Strain', value: strain.name, secure: true, httpOnly: true,
          }],
        })
          .then(({ uuid }) => this._calibre.Test.waitForTest(uuid))
          .then((result) => {
            if (this._junit) {
              this._junit.appendResults(result, params, strain.name);
            }
            return PerfCommand.formatResponse(result, params, strain.name);
          })
          .catch((err) => {
            console.error(err);
            return null;
          }));
      });

    const flattests = _.flatten(tests);
    Promise.all(flattests).then((results) => {
      if (this._junit) {
        this._junit.writeResults();
      }
      console.log('');
      const fail = results.filter(result => result === false).length;
      const succeed = results.filter(result => result === true).length;
      if (fail && succeed) {
        console.error(chalk.yellow(`all tests completed with ${fail} failures and ${succeed} successes.`));
      } else if (fail) {
        console.error(chalk.red(`all ${fail} tests failed.`));
      } else if (succeed) {
        console.log(chalk.green(`all ${succeed} tests succeeded.`));
      }
      process.exit(fail);
    });
  }
}

module.exports = PerfCommand;
