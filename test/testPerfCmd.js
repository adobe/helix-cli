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
const AssertionError = require('assert').AssertionError;
const path = require('path');
const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const { setupMocha: setupPolly } = require('@pollyjs/core');
const example = require('./utils').perfExample;
const PerfCommand = require('../src/perf.cmd.js');

describe('hlx perf #integrationtest', () => {
  
  setupPolly({
    adapters: [NodeHttpAdapter],
  });
  

  it('hlx perf --junit', async function test() {
    const { server } = this.polly;
    
    let reqcounter = 0;
    server
      .post('https://adobeioruntime.net/api/v1/web/helix/default/perf')
      .intercept((req, res) => {
        reqcounter = reqcounter + 1;

        if (reqcounter === 1) {
          res.sendStatus(200).json(["91af6cd", "5180ab5", "199489d", "0e0c0c3"]);
        }
        if (reqcounter === 2) {
          res.sendStatus(200).json([{
            "connection": {
              "title": "Regular 3G"
            },
            "device": {
              "title": "iPhone 8"
            },
            "formattedTestUrl": "https://calibreapp.com/tests/91af6cd/ea52f35",
            "location": {
              "emoji": "🇬🇧",
              "name": "London, United Kingdom"
            },
            "metrics": [{
              "label": "Lighthouse SEO Score",
              "name": "lighthouse-seo-score",
              "value": 89
            }, {
              "label": "Lighthouse Best Practices Score",
              "name": "lighthouse-best-practices-score",
              "value": 100
            }, {
              "label": "Lighthouse Accessibility Score",
              "name": "lighthouse-accessibility-score",
              "value": 59
            }, {
              "label": "Lighthouse Performance Score",
              "name": "lighthouse-performance-score",
              "value": 92
            }, {
              "label": "Lighthouse Progressive Web App Score",
              "name": "lighthouse-pwa-score",
              "value": 56
            }, {
              "label": "JS Parse & Compile",
              "name": "js-parse-compile",
              "value": 0
            }, {
              "label": "DOM Element Count",
              "name": "dom-size",
              "value": 134
            }, {
              "label": "85% Visually Complete",
              "name": "visually_complete_85",
              "value": 3793
            }, {
              "label": "Visually Complete",
              "name": "visually_complete",
              "value": 21859
            }, {
              "label": "Time to Interactive",
              "name": "consistently-interactive",
              "value": 2106
            }, {
              "label": "First CPU Idle",
              "name": "first-interactive",
              "value": 3798
            }, {
              "label": "Time to First Byte",
              "name": "time-to-first-byte",
              "value": 309
            }, {
              "label": "Estimated input latency",
              "name": "estimated-input-latency",
              "value": 16
            }, {
              "label": "Speed Index",
              "name": "speed_index",
              "value": 3161
            }, {
              "label": "First Meaningful Paint",
              "name": "first-meaningful-paint",
              "value": 3798
            }, {
              "label": "First Contentful Paint",
              "name": "first-contentful-paint",
              "value": 2106
            }, {
              "label": "First Paint",
              "name": "firstRender",
              "value": 2106
            }, {
              "label": "Total Image size in bytes",
              "name": "image_body_size_in_bytes",
              "value": 1913203
            }, {
              "label": "Total Image transferred",
              "name": "image_size_in_bytes",
              "value": 1918146
            }, {
              "label": "Total Webfont size in bytes",
              "name": "font_body_size_in_bytes",
              "value": 32300
            }, {
              "label": "Total Webfont transferred",
              "name": "font_size_in_bytes",
              "value": 32797
            }, {
              "label": "Total JavaScript size in bytes",
              "name": "js_body_size_in_bytes",
              "value": 53324
            }, {
              "label": "Total JavaScript Transferred",
              "name": "js_size_in_bytes",
              "value": 17701
            }, {
              "label": "Total CSS size in bytes",
              "name": "css_body_size_in_bytes",
              "value": 13150
            }, {
              "label": "Total CSS transferred",
              "name": "css_size_in_bytes",
              "value": 7210
            }, {
              "label": "Total HTML size in bytes",
              "name": "html_body_size_in_bytes",
              "value": 11847
            }, {
              "label": "Total HTML transferred",
              "name": "html_size_in_bytes",
              "value": 12069
            }, {
              "label": "Response time",
              "name": "page_wait_timing",
              "value": 539
            }, {
              "label": "Total Page transferred",
              "name": "page_size_in_bytes",
              "value": 1987923
            }, {
              "label": "Total Page size in bytes",
              "name": "page_body_size_in_bytes",
              "value": 2023824
            }, {
              "label": "Number of requests",
              "name": "asset_count",
              "value": 19
            }, {
              "label": "onLoad",
              "name": "onload",
              "value": 21839
            }, {
              "label": "onContentLoad",
              "name": "oncontentload",
              "value": 2096
            }],
            "status": "completed",
            "updatedAt": "2019-03-22T16:43:03Z",
            "url": "https://www.project-helix.io/",
            "uuid": "91af6cd"
          }, "5180ab5", "199489d", "0e0c0c3"]);
        }
        if (reqcounter > 2) {
          res.sendStatus(200).json([{
            "connection": {
              "title": "Regular 3G"
            },
            "device": {
              "title": "iPhone 8"
            },
            "formattedTestUrl": "https://calibreapp.com/tests/91af6cd/ea52f35",
            "location": {
              "emoji": "🇬🇧",
              "name": "London, United Kingdom"
            },
            "metrics": [{
              "label": "Lighthouse SEO Score",
              "name": "lighthouse-seo-score",
              "value": 89
            }, {
              "label": "Lighthouse Best Practices Score",
              "name": "lighthouse-best-practices-score",
              "value": 100
            }, {
              "label": "Lighthouse Accessibility Score",
              "name": "lighthouse-accessibility-score",
              "value": 59
            }, {
              "label": "Lighthouse Performance Score",
              "name": "lighthouse-performance-score",
              "value": 99
            }, {
              "label": "Lighthouse Progressive Web App Score",
              "name": "lighthouse-pwa-score",
              "value": 56
            }, {
              "label": "JS Parse & Compile",
              "name": "js-parse-compile",
              "value": 0
            }, {
              "label": "DOM Element Count",
              "name": "dom-size",
              "value": 134
            }, {
              "label": "85% Visually Complete",
              "name": "visually_complete_85",
              "value": 3793
            }, {
              "label": "Visually Complete",
              "name": "visually_complete",
              "value": 21859
            }, {
              "label": "Time to Interactive",
              "name": "consistently-interactive",
              "value": 2106
            }, {
              "label": "First CPU Idle",
              "name": "first-interactive",
              "value": 3798
            }, {
              "label": "Time to First Byte",
              "name": "time-to-first-byte",
              "value": 309
            }, {
              "label": "Estimated input latency",
              "name": "estimated-input-latency",
              "value": 16
            }, {
              "label": "Speed Index",
              "name": "speed_index",
              "value": 3161
            }, {
              "label": "First Meaningful Paint",
              "name": "first-meaningful-paint",
              "value": 3798
            }, {
              "label": "First Contentful Paint",
              "name": "first-contentful-paint",
              "value": 2106
            }, {
              "label": "First Paint",
              "name": "firstRender",
              "value": 2106
            }, {
              "label": "Total Image size in bytes",
              "name": "image_body_size_in_bytes",
              "value": 1913203
            }, {
              "label": "Total Image transferred",
              "name": "image_size_in_bytes",
              "value": 1918146
            }, {
              "label": "Total Webfont size in bytes",
              "name": "font_body_size_in_bytes",
              "value": 32300
            }, {
              "label": "Total Webfont transferred",
              "name": "font_size_in_bytes",
              "value": 32797
            }, {
              "label": "Total JavaScript size in bytes",
              "name": "js_body_size_in_bytes",
              "value": 53324
            }, {
              "label": "Total JavaScript Transferred",
              "name": "js_size_in_bytes",
              "value": 17701
            }, {
              "label": "Total CSS size in bytes",
              "name": "css_body_size_in_bytes",
              "value": 13150
            }, {
              "label": "Total CSS transferred",
              "name": "css_size_in_bytes",
              "value": 7210
            }, {
              "label": "Total HTML size in bytes",
              "name": "html_body_size_in_bytes",
              "value": 11847
            }, {
              "label": "Total HTML transferred",
              "name": "html_size_in_bytes",
              "value": 12069
            }, {
              "label": "Response time",
              "name": "page_wait_timing",
              "value": 539
            }, {
              "label": "Total Page transferred",
              "name": "page_size_in_bytes",
              "value": 1987923
            }, {
              "label": "Total Page size in bytes",
              "name": "page_body_size_in_bytes",
              "value": 2023824
            }, {
              "label": "Number of requests",
              "name": "asset_count",
              "value": 19
            }, {
              "label": "onLoad",
              "name": "onload",
              "value": 21839
            }, {
              "label": "onContentLoad",
              "name": "oncontentload",
              "value": 2096
            }],
            "status": "completed",
            "updatedAt": "2019-03-22T16:43:03Z",
            "url": "https://www.project-helix.io/",
            "uuid": "91af6cd"
          }, {
            "connection": {
              "title": "Regular 3G"
            },
            "device": {
              "title": "iPhone 8"
            },
            "formattedTestUrl": "https://calibreapp.com/tests/5180ab5/fab3d29",
            "location": {
              "emoji": "🇬🇧",
              "name": "London, United Kingdom"
            },
            "metrics": [{
              "label": "Lighthouse SEO Score",
              "name": "lighthouse-seo-score",
              "value": 99
            }, {
              "label": "Lighthouse Best Practices Score",
              "name": "lighthouse-best-practices-score",
              "value": 71
            }, {
              "label": "Lighthouse Accessibility Score",
              "name": "lighthouse-accessibility-score",
              "value": 60
            }, {
              "label": "Lighthouse Progressive Web App Score",
              "name": "lighthouse-pwa-score",
              "value": 28
            }, {
              "label": "Lighthouse Performance Score",
              "name": "lighthouse-performance-score",
              "value": 28
            }, {
              "label": "JS Parse & Compile",
              "name": "js-parse-compile",
              "value": 269
            }, {
              "label": "DOM Element Count",
              "name": "dom-size",
              "value": 673
            }, {
              "label": "85% Visually Complete",
              "name": "visually_complete_85",
              "value": 11009
            }, {
              "label": "Visually Complete",
              "name": "visually_complete",
              "value": 11009
            }, {
              "label": "First CPU Idle",
              "name": "first-interactive",
              "value": 7203
            }, {
              "label": "Time to First Byte",
              "name": "time-to-first-byte",
              "value": 308
            }, {
              "label": "Estimated input latency",
              "name": "estimated-input-latency",
              "value": 16
            }, {
              "label": "Speed Index",
              "name": "speed_index",
              "value": 9025
            }, {
              "label": "First Meaningful Paint",
              "name": "first-meaningful-paint",
              "value": 6482
            }, {
              "label": "First Contentful Paint",
              "name": "first-contentful-paint",
              "value": 6482
            }, {
              "label": "First Paint",
              "name": "firstRender",
              "value": 6482
            }, {
              "label": "Total JSON size in bytes",
              "name": "json_body_size_in_bytes",
              "value": 12774
            }, {
              "label": "Total JSON transferred",
              "name": "json_size_in_bytes",
              "value": 5256
            }, {
              "label": "Total Image size in bytes",
              "name": "image_body_size_in_bytes",
              "value": 277812
            }, {
              "label": "Total Image transferred",
              "name": "image_size_in_bytes",
              "value": 284156
            }, {
              "label": "Total Webfont size in bytes",
              "name": "font_body_size_in_bytes",
              "value": 106852
            }, {
              "label": "Total Webfont transferred",
              "name": "font_size_in_bytes",
              "value": 107986
            }, {
              "label": "Total JavaScript size in bytes",
              "name": "js_body_size_in_bytes",
              "value": 3228155
            }, {
              "label": "Total JavaScript Transferred",
              "name": "js_size_in_bytes",
              "value": 972207
            }, {
              "label": "Total CSS size in bytes",
              "name": "css_body_size_in_bytes",
              "value": 771753
            }, {
              "label": "Total CSS transferred",
              "name": "css_size_in_bytes",
              "value": 100371
            }, {
              "label": "Total HTML size in bytes",
              "name": "html_body_size_in_bytes",
              "value": 108885
            }, {
              "label": "Total HTML transferred",
              "name": "html_size_in_bytes",
              "value": 50202
            }, {
              "label": "Response time",
              "name": "page_wait_timing",
              "value": 836
            }, {
              "label": "Total Page transferred",
              "name": "page_size_in_bytes",
              "value": 1527831
            }, {
              "label": "Total Page size in bytes",
              "name": "page_body_size_in_bytes",
              "value": 4506329
            }, {
              "label": "Number of requests",
              "name": "asset_count",
              "value": 102
            }, {
              "label": "onLoad",
              "name": "onload",
              "value": 16770
            }, {
              "label": "onContentLoad",
              "name": "oncontentload",
              "value": 7203
            }],
            "status": "completed",
            "updatedAt": "2019-03-22T16:43:03Z",
            "url": "https://www.adobe.io/",
            "uuid": "5180ab5"
          }, {
            "connection": {
              "title": "Regular 3G"
            },
            "device": {
              "title": "iPhone 8"
            },
            "formattedTestUrl": "https://calibreapp.com/tests/199489d/c17a5f9",
            "location": {
              "emoji": "🇺🇸",
              "name": "North Virginia, USA"
            },
            "metrics": [{
              "label": "Lighthouse SEO Score",
              "name": "lighthouse-seo-score",
              "value": 91
            }, {
              "label": "Lighthouse Best Practices Score",
              "name": "lighthouse-best-practices-score",
              "value": 100
            }, {
              "label": "Lighthouse Accessibility Score",
              "name": "lighthouse-accessibility-score",
              "value": 90
            }, {
              "label": "Lighthouse Performance Score",
              "name": "lighthouse-performance-score",
              "value": 81
            }, {
              "label": "Lighthouse Progressive Web App Score",
              "name": "lighthouse-pwa-score",
              "value": 28
            }, {
              "label": "JS Parse & Compile",
              "name": "js-parse-compile",
              "value": 346
            }, {
              "label": "DOM Element Count",
              "name": "dom-size",
              "value": 1064
            }, {
              "label": "85% Visually Complete",
              "name": "visually_complete_85",
              "value": 12017
            }, {
              "label": "Visually Complete",
              "name": "visually_complete",
              "value": 23434
            }, {
              "label": "Time to Interactive",
              "name": "consistently-interactive",
              "value": 29332
            }, {
              "label": "First CPU Idle",
              "name": "first-interactive",
              "value": 21216
            }, {
              "label": "Time to First Byte",
              "name": "time-to-first-byte",
              "value": 318
            }, {
              "label": "Estimated input latency",
              "name": "estimated-input-latency",
              "value": 16
            }, {
              "label": "Speed Index",
              "name": "speed_index",
              "value": 14386
            }, {
              "label": "First Meaningful Paint",
              "name": "first-meaningful-paint",
              "value": 12003
            }, {
              "label": "First Contentful Paint",
              "name": "first-contentful-paint",
              "value": 12003
            }, {
              "label": "First Paint",
              "name": "firstRender",
              "value": 12003
            }, {
              "label": "Total JSON size in bytes",
              "name": "json_body_size_in_bytes",
              "value": 49739
            }, {
              "label": "Total JSON transferred",
              "name": "json_size_in_bytes",
              "value": 21099
            }, {
              "label": "Total Image size in bytes",
              "name": "image_body_size_in_bytes",
              "value": 314258
            }, {
              "label": "Total Image transferred",
              "name": "image_size_in_bytes",
              "value": 338309
            }, {
              "label": "Total Webfont size in bytes",
              "name": "font_body_size_in_bytes",
              "value": 684376
            }, {
              "label": "Total Webfont transferred",
              "name": "font_size_in_bytes",
              "value": 688364
            }, {
              "label": "Total JavaScript size in bytes",
              "name": "js_body_size_in_bytes",
              "value": 5048615
            }, {
              "label": "Total JavaScript Transferred",
              "name": "js_size_in_bytes",
              "value": 1059351
            }, {
              "label": "Total CSS size in bytes",
              "name": "css_body_size_in_bytes",
              "value": 3184009
            }, {
              "label": "Total CSS transferred",
              "name": "css_size_in_bytes",
              "value": 329461
            }, {
              "label": "Total HTML size in bytes",
              "name": "html_body_size_in_bytes",
              "value": 99973
            }, {
              "label": "Total HTML transferred",
              "name": "html_size_in_bytes",
              "value": 39115
            }, {
              "label": "Response time",
              "name": "page_wait_timing",
              "value": 519
            }, {
              "label": "Total Page transferred",
              "name": "page_size_in_bytes",
              "value": 2504700
            }, {
              "label": "Total Page size in bytes",
              "name": "page_body_size_in_bytes",
              "value": 9381086
            }, {
              "label": "Number of requests",
              "name": "asset_count",
              "value": 210
            }, {
              "label": "onLoad",
              "name": "onload",
              "value": 29332
            }, {
              "label": "onContentLoad",
              "name": "oncontentload",
              "value": 21216
            }],
            "status": "completed",
            "updatedAt": "2019-03-22T16:43:02Z",
            "url": "https://www.adobe.com/",
            "uuid": "199489d"
          }, "0e0c0c3"]);
        }
      });

    const perf = await new PerfCommand()
      .withFastlyAuth('fake')
      .withFastlyNamespace('fake')
      .withConfigFile(path.resolve(__dirname, 'fixtures/perf.yaml'))
      .withJunit('junit-results.xml');

    try {
      await perf.run();
      assert.fail();
    } catch (e) {
      if (e instanceof AssertionError) {
        throw e;
      }
      assert.equal(e.message, 'Performance test failed partially');
    }
  }).timeout(1000 * 60 * 10);
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
