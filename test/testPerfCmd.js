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
const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const { setupMocha: setupPolly } = require('@pollyjs/core');
const example = require('./utils').perfExample;
const PerfCommand = require('../src/perf.cmd.js');

describe('hlx perf #integrationtest', () => {
  /*
  setupPolly({
    adapters: [NodeHttpAdapter],
  });
  */

  it('hlx perf --junit', async function test() {
    /*
    const { server } = this.polly;
    */
    /*
    server
      .post('https://adobeioruntime.net/api/v1/web/helix/default/perf')
      .intercept((req, res) => res.sendStatus(200).json([
        {
          test: {
            url: 'https://www.project-helix.io',
            location: 'London',
            device: 'MotorolaMotoG4',
            connection: 'regular3G',
            strain: 'default',
          },
          uuid: '79dcdac',
          result: {
            uuid: '79dcdac',
            url: 'https://www.project-helix.io',
            formattedTestUrl: 'https://calibreapp.com/tests/79dcdac/4369858',
            status: 'completed',
            updatedAt: '2019-03-21T13:44:45Z',
            metrics: [
              {
                name: 'lighthouse-seo-score',
                label: 'Lighthouse SEO Score',
                value: 89,
              },
              {
                name: 'lighthouse-best-practices-score',
                label: 'Lighthouse Best Practices Score',
                value: 100,
              },
              {
                name: 'lighthouse-accessibility-score',
                label: 'Lighthouse Accessibility Score',
                value: 59,
              },
              {
                name: 'lighthouse-performance-score',
                label: 'Lighthouse Performance Score',
                value: 91,
              },
              {
                name: 'lighthouse-pwa-score',
                label: 'Lighthouse Progressive Web App Score',
                value: 56,
              },
              {
                name: 'js-parse-compile',
                label: 'JS Parse & Compile',
                value: 0,
              },
              { name: 'dom-size', label: 'DOM Element Count', value: 134 },
              {
                name: 'visually_complete_85',
                label: '85% Visually Complete',
                value: 4232,
              },
              {
                name: 'visually_complete',
                label: 'Visually Complete',
                value: 21965,
              },
              {
                name: 'consistently-interactive',
                label: 'Time to Interactive',
                value: 2154,
              },
              {
                name: 'first-interactive',
                label: 'First CPU Idle',
                value: 4223,
              },
              {
                name: 'time-to-first-byte',
                label: 'Time to First Byte',
                value: 314,
              },
              {
                name: 'estimated-input-latency',
                label: 'Estimated input latency',
                value: 16,
              },
              { name: 'speed_index', label: 'Speed Index', value: 2912 },
              {
                name: 'first-meaningful-paint',
                label: 'First Meaningful Paint',
                value: 4223,
              },
              {
                name: 'first-contentful-paint',
                label: 'First Contentful Paint',
                value: 2154,
              },
              { name: 'firstRender', label: 'First Paint', value: 2154 },
              {
                name: 'image_body_size_in_bytes',
                label: 'Total Image size in bytes',
                value: 1913203,
              },
              {
                name: 'image_size_in_bytes',
                label: 'Total Image transferred',
                value: 1918147,
              },
              {
                name: 'font_body_size_in_bytes',
                label: 'Total Webfont size in bytes',
                value: 42056,
              },
              {
                name: 'font_size_in_bytes',
                label: 'Total Webfont transferred',
                value: 42552,
              },
              {
                name: 'js_body_size_in_bytes',
                label: 'Total JavaScript size in bytes',
                value: 53324,
              },
              {
                name: 'js_size_in_bytes',
                label: 'Total JavaScript Transferred',
                value: 17708,
              },
              {
                name: 'css_body_size_in_bytes',
                label: 'Total CSS size in bytes',
                value: 6797,
              },
              {
                name: 'css_size_in_bytes',
                label: 'Total CSS transferred',
                value: 6744,
              },
              {
                name: 'html_body_size_in_bytes',
                label: 'Total HTML size in bytes',
                value: 11847,
              },
              {
                name: 'html_size_in_bytes',
                label: 'Total HTML transferred',
                value: 12069,
              },
              {
                name: 'page_wait_timing',
                label: 'Response time',
                value: 594,
              },
              {
                name: 'page_size_in_bytes',
                label: 'Total Page transferred',
                value: 1997220,
              },
              {
                name: 'page_body_size_in_bytes',
                label: 'Total Page size in bytes',
                value: 2027227,
              },
              { name: 'asset_count', label: 'Number of requests', value: 19 },
              { name: 'onload', label: 'onLoad', value: 21952 },
              { name: 'oncontentload', label: 'onContentLoad', value: 2138 },
            ],
            device: { title: 'Motorola Moto G4' },
            connection: { title: 'Regular 3G' },
            location: { name: 'London, United Kingdom', emoji: '🇬🇧' },
          },
        },
        {
          test: {
            url: 'https://www.adobe.io',
            location: 'London',
            device: 'MotorolaMotoG4',
            connection: 'regular3G',
            strain: 'default',
          },
          uuid: '25673b9',
          result: {
            uuid: '25673b9',
            url: 'https://www.adobe.io',
            formattedTestUrl: 'https://calibreapp.com/tests/25673b9/264ee9c',
            status: 'completed',
            updatedAt: '2019-03-21T13:44:38Z',
            metrics: [
              {
                name: 'lighthouse-seo-score',
                label: 'Lighthouse SEO Score',
                value: 89,
              },
              {
                name: 'lighthouse-best-practices-score',
                label: 'Lighthouse Best Practices Score',
                value: 71,
              },
              {
                name: 'lighthouse-accessibility-score',
                label: 'Lighthouse Accessibility Score',
                value: 60,
              },
              {
                name: 'lighthouse-pwa-score',
                label: 'Lighthouse Progressive Web App Score',
                value: 28,
              },
              {
                name: 'js-parse-compile',
                label: 'JS Parse & Compile',
                value: 2132,
              },
              { name: 'dom-size', label: 'DOM Element Count', value: 672 },
              {
                name: 'visually_complete_85',
                label: '85% Visually Complete',
                value: 10886,
              },
              {
                name: 'visually_complete',
                label: 'Visually Complete',
                value: 11069,
              },
              {
                name: 'first-interactive',
                label: 'First CPU Idle',
                value: 9840,
              },
              {
                name: 'time-to-first-byte',
                label: 'Time to First Byte',
                value: 315,
              },
              {
                name: 'estimated-input-latency',
                label: 'Estimated input latency',
                value: 157,
              },
              { name: 'speed_index', label: 'Speed Index', value: 8382 },
              {
                name: 'first-meaningful-paint',
                label: 'First Meaningful Paint',
                value: 6725,
              },
              {
                name: 'first-contentful-paint',
                label: 'First Contentful Paint',
                value: 6725,
              },
              { name: 'firstRender', label: 'First Paint', value: 6725 },
              {
                name: 'json_body_size_in_bytes',
                label: 'Total JSON size in bytes',
                value: 12774,
              },
              {
                name: 'json_size_in_bytes',
                label: 'Total JSON transferred',
                value: 5256,
              },
              {
                name: 'image_body_size_in_bytes',
                label: 'Total Image size in bytes',
                value: 277812,
              },
              {
                name: 'image_size_in_bytes',
                label: 'Total Image transferred',
                value: 284235,
              },
              {
                name: 'font_body_size_in_bytes',
                label: 'Total Webfont size in bytes',
                value: 116968,
              },
              {
                name: 'font_size_in_bytes',
                label: 'Total Webfont transferred',
                value: 111607,
              },
              {
                name: 'js_body_size_in_bytes',
                label: 'Total JavaScript size in bytes',
                value: 3227185,
              },
              {
                name: 'js_size_in_bytes',
                label: 'Total JavaScript Transferred',
                value: 971846,
              },
              {
                name: 'css_body_size_in_bytes',
                label: 'Total CSS size in bytes',
                value: 771753,
              },
              {
                name: 'css_size_in_bytes',
                label: 'Total CSS transferred',
                value: 100307,
              },
              {
                name: 'html_body_size_in_bytes',
                label: 'Total HTML size in bytes',
                value: 101030,
              },
              {
                name: 'html_size_in_bytes',
                label: 'Total HTML transferred',
                value: 48939,
              },
              {
                name: 'page_wait_timing',
                label: 'Response time',
                value: 882,
              },
              {
                name: 'page_size_in_bytes',
                label: 'Total Page transferred',
                value: 1529757,
              },
              {
                name: 'page_body_size_in_bytes',
                label: 'Total Page size in bytes',
                value: 4507620,
              },
              {
                name: 'asset_count',
                label: 'Number of requests',
                value: 101,
              },
              { name: 'onload', label: 'onLoad', value: 15694 },
              { name: 'oncontentload', label: 'onContentLoad', value: 7685 },
            ],
            device: { title: 'Motorola Moto G4' },
            connection: { title: 'Regular 3G' },
            location: { name: 'London, United Kingdom', emoji: '🇬🇧' },
          },
        },
      ]));
      */

    const perf = await new PerfCommand()
      .withFastlyAuth('rSKbwCOF8tryeSoaU3v6CpF0lkR1IgpN')
      .withFastlyNamespace('6E6ge7REhiWetPCqy9jht2')
      .withConfigFile(path.resolve(__dirname, 'fixtures/perf.yaml'))
      .withJunit('junit-results.xml');

    await perf.run();
  }).timeout(1000 * 60 * 5);
});

describe('hlx perf #unittest', () => {
  it('formatScore() #unittest', () => {
    assert.equal(
      PerfCommand.formatScore(49, 50),
      '\u001b[31m\u001b[1m49\u001b[22m\u001b[39m\u001b[31m (failed)\u001b[39m',
    );
    assert.equal(
      PerfCommand.formatScore(0, 50),
      '\u001b[31m\u001b[1m0\u001b[22m\u001b[39m\u001b[31m (failed)\u001b[39m',
    );
    assert.equal(
      PerfCommand.formatScore(50, 50),
      '\u001b[32m\u001b[1m50\u001b[22m\u001b[39m',
    );
    assert.equal(
      PerfCommand.formatScore(100, 50),
      '\u001b[32m\u001b[1m100\u001b[22m\u001b[39m',
    );
  });

  it('formatMeasure() #unittest', () => {
    assert.equal(
      PerfCommand.formatMeasure(49, 50),
      '\u001b[32m\u001b[1m49\u001b[22m\u001b[39m',
    );
    assert.equal(
      PerfCommand.formatMeasure(0, 50),
      '\u001b[32m\u001b[1m0\u001b[22m\u001b[39m',
    );
    assert.equal(
      PerfCommand.formatMeasure(50, 50),
      '\u001b[32m\u001b[1m50\u001b[22m\u001b[39m',
    );
    assert.equal(
      PerfCommand.formatMeasure(100, 50),
      '\u001b[31m\u001b[1m100\u001b[22m\u001b[39m\u001b[31m (failed)\u001b[39m',
    );
  });

  it('format() #unittest', () => {
    const pc = new PerfCommand();
    assert.equal(pc.format(example.metrics, 'unknown-metric', 100), undefined);
    assert.equal(
      pc.format(example.metrics, 'lighthouse-seo-score', 100),
      false,
    );
    assert.equal(pc.format(example.metrics, 'lighthouse-seo-score', 0), true);

    assert.equal(pc.format(example.metrics, 'visually_complete', 1000), false);
    assert.equal(pc.format(example.metrics, 'visually_complete', 2000), true);
  });

  it('formatResponse() #unittest', () => {
    const pc = new PerfCommand();

    // default
    assert.equal(pc.formatResponse(example), false);

    // all failed
    assert.equal(
      pc.formatResponse(example, {
        'lighthouse-seo-score': 100,
        visually_complete: 1000,
      }),
      false,
    );

    // all succeeded
    assert.equal(
      pc.formatResponse(example, {
        'lighthouse-seo-score': 0,
        visually_complete: 2000,
      }),
      true,
    );

    // some failed
    assert.equal(
      pc.formatResponse(example, {
        'lighthouse-seo-score': 0,
        visually_complete: 1000,
      }),
      false,
    );
  });

  it('getDefaultParams() #unittest', async () => {
    const defcmd = await new PerfCommand()
      .withConfigFile(path.resolve(__dirname, 'fixtures/default.yaml'))
      .init();
    const perfcmd = await new PerfCommand()
      .withConfigFile(path.resolve(__dirname, 'fixtures/perf.yaml'))
      .init();

    assert.equal(defcmd.getDefaultParams().device, 'MotorolaMotoG4');
    assert.equal(perfcmd.getDefaultParams().device, 'MotorolaMotoG4');
  });

  it('getDefaultParams() override #unittest', async () => {
    const defcmd = await new PerfCommand()
      .withConfigFile(path.resolve(__dirname, 'fixtures/default.yaml'))
      .withDevice('Nexus5X')
      .withLocation('Oregon')
      .withConnection('slow2G')
      .init();

    assert.equal(defcmd.getDefaultParams().connection, 'slow2G');
    assert.equal(defcmd.getDefaultParams().device, 'Nexus5X');
    assert.equal(defcmd.getDefaultParams().location, 'Oregon');
  });

  it('getStrainParams() #unittest', async () => {
    const defcmd = await new PerfCommand()
      .withConfigFile(path.resolve(__dirname, 'fixtures/default.yaml'))
      .init();
    assert.equal(defcmd.getStrainParams({}).device, 'MotorolaMotoG4');
    assert.equal(
      defcmd.getStrainParams({ perf: { device: 'iPad' } }).device,
      'iPad',
    );
  });
});
