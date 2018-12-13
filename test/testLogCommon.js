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

/* eslint-env mocha */
const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');
const logCommon = require('../src/log-common');

const testlogfile = path.resolve(__dirname, 'tmp', 'testlog.log');
const testjsonfile = path.resolve(__dirname, 'tmp', 'testlog.json');

describe('Testing standard logger configuration', () => {
  async function clean() {
    await Promise.all([
      fs.remove(testlogfile),
      fs.remove(testjsonfile)]);
  }

  beforeEach(async () => {
    // reset the winston loggers
    winston.loggers.loggers.clear();
    await clean();
  });

  afterEach(clean);

  it('Log level can be specified on the command line', () => {
    assert.equal(logCommon.makeLogger({ logLevel: 'debug' }).level, 'debug');
  });

  it('Default log level is info', () => {
    assert.equal(logCommon.makeLogger({}).level, 'info');
  });

  it('Multiple loggers can be created', () => {
    assert.equal(logCommon.makeLogger({ logFile: ['-', '-', '-'] }).transports.length, 3);
  });

  it('File logger can be created', (done) => {
    const logger = logCommon.makeLogger({ logFile: [testlogfile] });
    logger.info('This is just a test');
    logger.warn('This is just a test');
    logger.error('This is just a test');

    setTimeout(() => {
      const log = fs.readFileSync(testlogfile).toString();
      assert.equal(log.split('\n').length, 4);
      done();
    }, 100);
  });

  it('JSON logger can be created', (done) => {
    const logger = logCommon.makeLogger({ logFile: [testjsonfile] });
    logger.error('This is just a test');

    setTimeout(() => {
      const log = fs.readJSONSync(testjsonfile);
      assert.equal(log['@message'], 'This is just a test');
      done();
    }, 100);
  });
});
