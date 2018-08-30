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
const PerfCommand = require('../src/perf.cmd.js');


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
});
