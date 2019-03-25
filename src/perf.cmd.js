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
const request = require('request-promise-native');
const path = require('path');
const _ = require('lodash/fp');
const JunitPerformanceReport = require('./junit-utils');
const AbstractCommand = require('./abstract.cmd.js');

class PerfCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._location = 'London';
    this._device = 'MotorolaMotoG4';
    this._connection = 'regular3G';
    this._junit = null;
    this._fastly_namespace = null;
    this._fastly_auth = null;
  }

  withFastlyNamespace(value) {
    this._fastly_namespace = value;
    return this;
  }

  withFastlyAuth(value) {
    this._fastly_auth = value;
    return this;
  }

  withJunit(value) {
    if (value && value !== '') {
      this._junit = new JunitPerformanceReport().withOutfile(path.resolve(process.cwd(), value));
    }
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

  getDefaultParams() {
    const defaultparams = {
      device: this._device,
      location: this._location,
      connection: this._connection,
    };
    return defaultparams;
  }

  getStrainParams(strain) {
    if (strain.perf) {
      return {
        device: strain.perf.device || this._device,
        location: strain.perf.location || this._location,
        connection: strain.perf.connection || this._connection
      }
    }
    return this.getDefaultParams();
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
  format(metrics, name, limit) {
    const metric = metrics.filter(m => m.name === name).length >= 1
      ? metrics.filter(m => m.name === name)[0] : null;
    if (metric && metric.name.endsWith('-score')) {
      this.log.info(`  ${chalk.gray(`${metric.label}: `)}${PerfCommand.formatScore(metric.value, limit)}`);
      return PerfCommand.formatScore(metric.value, limit).indexOf('(failed)') === -1;
    } if (metric) {
      this.log.info(`  ${chalk.gray(`${metric.label}: `)}${PerfCommand.formatMeasure(metric.value, limit)}`);
      return PerfCommand.formatMeasure(metric.value, limit).indexOf('(failed)') === -1;
    }
    return undefined;
  }

  formatResponse(response, params = {}, strainname = 'default') {
    this.log.info(`\nResults for ${response.url} on ${response.device.title} (${response.connection.title}) from ${response.location.emoji}  ${response.location.name} using ${strainname} strain.\n`);
    const strainresults = Object.keys(params).map((key) => {
      const value = params[key];
      if (Number.isInteger(value)) {
        return this.format(response.metrics, key, value);
      }
      return undefined;
    });
    if (strainresults.length === 0 || strainresults.every(val => val === undefined)) {
      const perf = this.format(response.metrics, 'lighthouse-performance-score', 80);
      const access = this.format(response.metrics, 'lighthouse-accessibility-score', 80);
      // use the default metrics
      return  access && perf;
    }
    // make sure all tests have been passed
    return strainresults.every(result => result === true || result === undefined);
  }

  async run() {
    await this.init();
    this.log.info(chalk.green('Testing performance…'));

    const tests = this.config.strains
      .getByFilter(({ urls }) => urls.length)
      .map((strain) => {
        const { location, device, connection } = this.getStrainParams(strain);
        return strain.urls.map(url => Object.assign({}, {
          url,
          location,
          device,
          connection,
          strain: strain.name,
        }, strain.perf));
      });
    const flatttests = _.flatten(tests);
    const uri = 'https://adobeioruntime.net/api/v1/web/helix/default/perf';

    const schedule = await request.post(uri, {
      json: true,
      body: {
        service: this._fastly_namespace,
        token: this._fastly_auth,
        tests: flatttests,
      },
    });

    let retries = 0;
    let results = [];
    while (retries < 10) {
      retries = retries + 1;
      const completed = results.filter(res => typeof res === 'object').length;
      console.log(chalk.yellow(`Waiting for test results (${completed}/${flatttests.length})`));
      results = await request.post(uri, {
        json: true,
        body: {
          service: this._fastly_namespace,
          token: this._fastly_auth,
          tests: schedule,
        }
      });

      if (results.reduce((p, uuid) => p && typeof uuid === 'object', true)) {
        break;
      }
    }

    let skipped = 0;
    const formatted = _.zip(results, flatttests).map(([result, test]) => {
      if (this._junit && typeof result === 'object') {
        this._junit.appendResults(result, test._thresholds, test.strain);
      }
      if (typeof result === 'object') {
        return this.formatResponse(result, test._thresholds, test.strain);
      } else {
        skipped = skipped + 1;
        console.log(chalk.yellow(`\nSkipped test for ${test.url} on ${test.strain}`));
        return undefined;
      }
    });

    if (this._junit) {
      this._junit.writeResults();
    }

    const fail = formatted.filter(result => result === false).length;
    const succeed = formatted.filter(result => result === true).length;
    if (skipped) {
      console.log(chalk.yellow(`${skipped} tests skipped due to 10 minute timeout`));
    }
    if (fail && succeed) {
      this.log.error(chalk.yellow(`all tests completed with ${fail} failures and ${succeed} successes.`));
      throw new Error('Performance test failed partially');
    } else if (fail) {
      this.log.error(chalk.red(`all ${fail} tests failed.`));
      throw new Error('Performance test failed entirely');
    } else if (succeed) {
      this.log.log(chalk.green(`all ${succeed} tests succeeded.`));
    }
  }
}

module.exports = PerfCommand;
