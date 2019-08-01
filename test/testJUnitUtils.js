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
const { perfExample, createTestRoot } = require('./utils');
const JunitPerformanceReport = require('../src/junit-utils');

describe('Test Junit Report Builder', () => {
  let root;

  beforeEach(async () => {
    root = await createTestRoot();
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  it('Responses can be appended', () => {
    const outfile = path.resolve(root, 'simple.xml');
    const report = new JunitPerformanceReport().withOutfile(outfile);
    report.appendResults(perfExample);
    report.writeResults();

    assert.equal(fs.readFileSync(outfile).toString(), fs.readFileSync(path.resolve(__dirname, 'fixtures', 'simple.xml')).toString());
  });

  it('Custom performance budgets are respected', () => {
    const outfile = path.resolve(root, 'custom.xml');
    const report = new JunitPerformanceReport().withOutfile(outfile);
    report.appendResults(perfExample, {
      visually_complete: 1500,
      visually_complete_85: 1000,
    });
    report.writeResults();

    assert.equal(fs.readFileSync(outfile).toString(), fs.readFileSync(path.resolve(__dirname, 'fixtures', 'custom.xml')).toString());
  });

  it('Multiple Test Suites are possible', () => {
    const outfile = path.resolve(root, 'double.xml');
    const report = new JunitPerformanceReport().withOutfile(outfile);
    report.appendResults(perfExample);
    report.appendResults(perfExample);
    report.writeResults();

    assert.equal(fs.readFileSync(outfile).toString(), fs.readFileSync(path.resolve(__dirname, 'fixtures', 'double.xml')).toString());
  });
});
