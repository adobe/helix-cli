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

const path = require('path');
const builder = require('junit-report-builder');

class JunitPerformanceReport {
  constructor() {
    this._outfile = path.resolve(process.cwd(), 'test-results.xml');
  }

  withOutfile(value) {
    this._outfile = value;
    return this;
  }

  appendResults(result, params = {}, strainname = 'default') {
    this._suite = builder.testSuite().name(`Performance Tests on ${result.device.title} (${result.connection.title}) from ${result.location.name} using ${strainname} strain.`);
    this._suite.timestamp(result.updatedAt);

    result.metrics.map((metric) => {
      const test = this._suite.testCase().className(result.url).name(metric.label);
      if (!/(_index|-score|_bytes|-size|_count)$/.test(metric.name)) {
        test.time(metric.value / 1000);
      }
      const { status, message } = JunitPerformanceReport.getSuccess(
        params,
        metric.name,
        metric.value,
      );
      if (status === 'passed') {
        test.standardOutput(message);
      } else if (status === 'failed') {
        test.failure(message);
      } else {
        test.skipped();
      }
      return true;
    });
  }

  static getLimit(params = {}, name) {
    const value = params[name];
    if (Number.isInteger(value)) {
      return value;
    } if (name === 'lighthouse-performance-score') {
      return 80;
    } if (name === 'lighthouse-accessibility-score') {
      return 80;
    }
    return undefined;
  }

  static getSuccess(params = {}, name, value) {
    const limit = JunitPerformanceReport.getLimit(params, name);
    if (!limit) {
      return { status: 'skipped', message: `No limit set for ${name}. Value ${value} not considered.` };
    } if (/-score/.test(name)) {
      if (value >= limit) {
        return { status: 'passed', message: `Score ${name} of ${value} meets lower bound of ${limit}` };
      }
      return { status: 'failed', message: `Score ${name} of ${value} below lower bound of ${limit}` };
    }
    if (value >= limit) {
      return { status: 'failed', message: `Metric ${name} of ${value} exceeds limit of ${limit}` };
    }
    return { status: 'passed', message: `Metric ${name} of ${value} below limit of ${limit}` };
  }

  writeResults() {
    builder.writeTo(this._outfile);
  }
}

module.exports = JunitPerformanceReport;
