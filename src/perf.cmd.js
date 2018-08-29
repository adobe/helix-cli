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

/* eslint-disable no-console */
// eslint-disable-next-line no-unused-vars
const example = {
  uuid: '170b278',
  url: 'https://debug.primordialsoup.life/develop/',
  formattedTestUrl: 'https://calibreapp.com/tests/170b278/4161820',
  status: 'completed',
  updatedAt: '2018-08-29T13:00:08Z',
  metrics: [
    { name: 'speed_index', label: 'Speed Index', value: 1233 },
    {
      name: 'visually_complete',
      label: 'Visually Complete',
      value: 1233,
    },
    {
      name: 'visually_complete_85',
      label: '85% Visually Complete',
      value: 1233,
    },
    {
      name: 'lighthouse-seo-score',
      label: 'Lighthouse SEO Score',
      value: 44,
    },
    {
      name: 'lighthouse-best-practices-score',
      label: 'Lighthouse Best Practices Score',
      value: 87,
    },
    {
      name: 'lighthouse-accessibility-score',
      label: 'Lighthouse Accessibility Score',
      value: 50,
    },
    {
      name: 'lighthouse-performance-score',
      label: 'Lighthouse Performance Score',
      value: 99,
    },
    {
      name: 'lighthouse-pwa-score',
      label: 'Lighthouse Progressive Web App Score',
      value: 36,
    },
    {
      name: 'js-parse-compile',
      label: 'JS Parse & Compile',
      value: 0,
    },
    {
      name: 'time-to-first-byte',
      label: 'Time to First Byte',
      value: 1064,
    },
    {
      name: 'first-contentful-paint',
      label: 'First Contentful Paint',
      value: 1218,
    },
    {
      name: 'first-meaningful-paint',
      label: 'First Meaningful Paint',
      value: 1218,
    },
    { name: 'firstRender', label: 'First Paint', value: 1218 },
    { name: 'dom-size', label: 'DOM Element Count', value: 3 },
    {
      name: 'estimated-input-latency',
      label: 'Estimated input latency',
      value: 16,
    },
    {
      name: 'consistently-interactive',
      label: 'Time to Interactive',
      value: 1218,
    },
    {
      name: 'first-interactive',
      label: 'First CPU Idle',
      value: 1218,
    },
    {
      name: 'html_body_size_in_bytes',
      label: 'Total HTML size in bytes',
      value: 80,
    },
    {
      name: 'html_size_in_bytes',
      label: 'Total HTML transferred',
      value: 239,
    },
    { name: 'page_wait_timing', label: 'Response time', value: 1236 },
    {
      name: 'page_size_in_bytes',
      label: 'Total Page transferred',
      value: 239,
    },
    {
      name: 'page_body_size_in_bytes',
      label: 'Total Page size in bytes',
      value: 80,
    },
    { name: 'asset_count', label: 'Number of requests', value: 1 },
    { name: 'onload', label: 'onLoad', value: 1196 },
    { name: 'oncontentload', label: 'onContentLoad', value: 1198 },
  ],
  device: { title: 'Motorola Moto G4' },
  connection: { title: 'Regular 3G' },
  location: { name: 'London, United Kingdom', emoji: '🇬🇧' },
};

class PerfCommand {
  constructor() {
    this._strainFile = path.resolve(process.cwd(), '.hlx', 'strains.yaml');
    this._strains = null;
    this._auth = null;
    this._calibre = null;
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
      connection: 'regular3G',
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

  static formatResponse(response, params) {
    console.log(`\nTesting ${response.url} on ${response.device.title} (${response.connection.title}) from ${response.location.emoji}  ${response.location.name}\n`);
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
        })
          .then(({ uuid }) => this._calibre.Test.waitForTest(uuid))
          .then(result => PerfCommand.formatResponse(result, params))
          .catch((err) => {
            console.error(err);
            return null;
          }));
      });

    const flattests = _.flatten(tests);
    Promise.all(flattests).then((results) => {
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
