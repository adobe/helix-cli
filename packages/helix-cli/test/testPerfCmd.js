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
const path = require('path');
const PerfCommand = require('../src/perf.cmd.js');
const example = require('./utils').perfExample;

describe('hlx perf #unittest', () => {
  it('formatScore() #unittest', () => {
    assert.equal(PerfCommand.formatScore(49, 50), '\u001b[31m\u001b[1m49\u001b[22m\u001b[39m\u001b[31m (failed)\u001b[39m');
    assert.equal(PerfCommand.formatScore(0, 50), '\u001b[31m\u001b[1m0\u001b[22m\u001b[39m\u001b[31m (failed)\u001b[39m');
    assert.equal(PerfCommand.formatScore(50, 50), '\u001b[32m\u001b[1m50\u001b[22m\u001b[39m');
    assert.equal(PerfCommand.formatScore(100, 50), '\u001b[32m\u001b[1m100\u001b[22m\u001b[39m');
  });

  it('formatMeasure() #unittest', () => {
    assert.equal(PerfCommand.formatMeasure(49, 50), '\u001b[32m\u001b[1m49\u001b[22m\u001b[39m');
    assert.equal(PerfCommand.formatMeasure(0, 50), '\u001b[32m\u001b[1m0\u001b[22m\u001b[39m');
    assert.equal(PerfCommand.formatMeasure(50, 50), '\u001b[32m\u001b[1m50\u001b[22m\u001b[39m');
    assert.equal(PerfCommand.formatMeasure(100, 50), '\u001b[31m\u001b[1m100\u001b[22m\u001b[39m\u001b[31m (failed)\u001b[39m');
  });

  it('getURLs() #unittest', () => {
    assert.deepEqual(PerfCommand.getURLs({}), []);
    assert.deepEqual(PerfCommand.getURLs({ url: 'http://example.com' }), ['http://example.com']);
    assert.deepEqual(PerfCommand.getURLs({ urls: ['https://www.adobe.com'] }), ['https://www.adobe.com']);
    assert.deepEqual(PerfCommand.getURLs({ url: 'http://example.com', urls: ['https://www.adobe.com'] }), ['http://example.com', 'https://www.adobe.com']);
  });

  it('format() #unittest', () => {
    assert.equal(PerfCommand.format(example.metrics, 'unknown-metric', 100), undefined);
    assert.equal(PerfCommand.format(example.metrics, 'lighthouse-seo-score', 100), false);
    assert.equal(PerfCommand.format(example.metrics, 'lighthouse-seo-score', 0), true);

    assert.equal(PerfCommand.format(example.metrics, 'visually_complete', 1000), false);
    assert.equal(PerfCommand.format(example.metrics, 'visually_complete', 2000), true);
  });

  it('formatResponse() #unittest', () => {
    // default
    assert.equal(PerfCommand.formatResponse(example), false);

    // all failed
    assert.equal(PerfCommand.formatResponse(example, {
      'lighthouse-seo-score': 100,
      visually_complete: 1000,
    }), false);

    // all succeeded
    assert.equal(PerfCommand.formatResponse(example, {
      'lighthouse-seo-score': 0,
      visually_complete: 2000,
    }), true);

    // some failed
    assert.equal(PerfCommand.formatResponse(example, {
      'lighthouse-seo-score': 0,
      visually_complete: 1000,
    }), false);
  });

  it('getDefaultParams() #unittest', () => {
    const defcmd = new PerfCommand().withStrainFile(path.resolve(__dirname, 'fixtures/default.yaml'));
    const perfcmd = new PerfCommand().withStrainFile(path.resolve(__dirname, 'fixtures/perf.yaml'));

    assert.equal(defcmd.getDefaultParams().device, 'MotorolaMotoG4');
    assert.equal(perfcmd.getDefaultParams().device, 'iPhone8');
  });

  it('getDefaultParams() override #unittest', () => {
    const defcmd = new PerfCommand()
      .withStrainFile(path.resolve(__dirname, 'fixtures/default.yaml'))
      .withDevice('Nexus5X')
      .withLocation('Oregon')
      .withConnection('slow2G');

    assert.equal(defcmd.getDefaultParams().connection, 'slow2G');
    assert.equal(defcmd.getDefaultParams().device, 'Nexus5X');
    assert.equal(defcmd.getDefaultParams().location, 'Oregon');
  });

  it('getStrainParams() #unittest', () => {
    const defcmd = new PerfCommand().withStrainFile(path.resolve(__dirname, 'fixtures/default.yaml'));
    assert.equal(defcmd.getStrainParams({}).device, 'MotorolaMotoG4');
    assert.equal(defcmd.getStrainParams({ perf: { device: 'iPad' } }).device, 'iPad');
  });

  it('withCalibreAuth() #unittest', () => {
    new PerfCommand().withCalibreAuth('foobar');
    assert.equal(process.env.CALIBRE_API_TOKEN, 'foobar');
  });
});
