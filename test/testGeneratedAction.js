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
process.env.HELIX_FETCH_FORCE_HTTP1 = 'true';

const assert = require('assert');
const fs = require('fs-extra');
const sinon = require('sinon');
const { logging } = require('@adobe/helix-testutils');
const {
  processSource, getTestModules, requireWithPaths, setupPolly,
} = require('./utils');

const params = {
  path: '/hello.md',
  __ow_method: 'get',
  owner: 'trieloff',
  SECRET: '🎶 agent man',
  __ow_headers: {
    'X-Forwarded-Port': '443',
    'X-CDN-Request-Id': '2a208a89-e071-44cf-aee9-220880da4c1e',
    'Fastly-Client': '1',
    'X-Forwarded-Host': 'adobeioruntime.net',
    'Upgrade-Insecure-Requests': '1',
    Host: 'controller-a',
    Connection: 'close',
    'Fastly-SSL': '1',
    'X-Request-Id': 'RUss5tPdgOfw74a68aNc24FeTipGpVfW',
    'X-Branch': 'master',
    'Accept-Language': 'en-US, en;q=0.9, de;q=0.8',
    'X-Forwarded-Proto': 'https',
    'Fastly-Orig-Accept-Encoding': 'gzip',
    'X-Varnish': '267021320',
    DNT: '1',
    'X-Forwarded-For':
          '192.147.117.11, 157.52.92.27, 23.235.46.33, 10.64.221.107',
    'X-Host': 'www.primordialsoup.life',
    Accept:
          'text/html, application/xhtml+xml, application/xml;q=0.9, image/webp, image/apng, */*;q=0.8',
    'X-Real-IP': '10.64.221.107',
    'X-Forwarded-Server': 'cache-lcy19249-LCY, cache-iad2127-IAD',
    'Fastly-Client-IP': '192.147.117.11',
    'Perf-Br-Req-In': '1529585370.116',
    'X-Timer': 'S1529585370.068237,VS0,VS0',
    'Fastly-FF':
          'dc/x3e9z8KMmlHLQr8BEvVMmTcpl3y2YY5y6gjSJa3g=!LCY!cache-lcy19249-LCY, dc/x3e9z8KMmlHLQr8BEvVMmTcpl3y2YY5y6gjSJa3g=!LCY!cache-lcy19227-LCY, dc/x3e9z8KMmlHLQr8BEvVMmTcpl3y2YY5y6gjSJa3g=!IAD!cache-iad2127-IAD, dc/x3e9z8KMmlHLQr8BEvVMmTcpl3y2YY5y6gjSJa3g=!IAD!cache-iad2133-IAD',
    'Accept-Encoding': 'gzip',
    'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36',
  },
  repo: 'soupdemo',
  ref: 'master',
  selector: 'md',
  branch: 'master',
};

const TEST_SCRIPTS = [
  { name: 'html', matches: [/Hello, world/] },
  { name: 'asynchelpx_html', matches: [/myinjectedcontextpath/] },
  { name: 'helpx_html', matches: [/myinjectedcontextpath/] },
  { name: 'logger_html', matches: [/Hello, world/, /this is a bar/] },
  { name: 'async_html', matches: [/Hello, world/, /this is a bar/] },
  { name: 'return_async_html', matches: [/Hello, world/, /this is a bar/] },
  { name: 'promise_html', matches: [/Hello, world/, /this is a bar/] },
  { name: 'return_promise_html', matches: [/Hello, world/, /this is a bar/] },
  { name: 'require_html', matches: [/Hello, world/, /this is a bar/] },
  { name: 'require_noext_html', matches: [/Hello, world/, /this is a bar/] },
  { name: 'simple_html', matches: [/Hello, world/, /this is a bar/] },
  { name: 'return_simple_html', matches: [/Hello, world/, /this is a bar/] },
  { name: 'xml', type: 'js', matches: [/works: bar/] },
  { name: 'async_xml', type: 'js', matches: [/works: bar/] },
];

describe('Generated Action Tests', () => {
  let testModules;

  before(async function beforeAll() {
    this.timeout(60000); // ensure enough time for installing modules on slow machines
    testModules = await getTestModules();
  });

  TEST_SCRIPTS.forEach((testScript) => {
    describe(`Testing ${testScript.name}`, () => {
      let distJS;
      let distHtl;
      let testRoot;

      setupPolly({
        recordIfMissing: false,
      });

      before(`Run builder programmatically on ${testScript.name}`, async () => {
        process.env.HELIX_PIPELINE_FORCE_HTTP1 = true;
        ({ distHtmlJS: distJS, distHtmlHtl: distHtl, testRoot } = await processSource(
          testScript.name,
          testScript.type,
          [testModules, ...module.paths],
        ));
      });

      after(async () => {
        delete process.env.HELIX_PIPELINE_FORCE_HTTP1;
        await fs.remove(testRoot);
      });

      it('correct output files have been generated', () => {
        assert.ok(fs.existsSync(distJS), 'output file has been generated');
        if (testScript.type !== 'js') {
          assert.ok(!fs.existsSync(distHtl), 'input file has been passed through');
        }
      });

      it('script can be required', () => {
        const script = requireWithPaths(distJS, testModules);
        assert.ok(script);
      });

      it('script has main function', () => {
        const script = requireWithPaths(distJS, testModules);
        assert.ok(script.main);
        assert.equal(typeof script.main, 'function');
      });

      it('script can be executed', async function test() {
        this.polly.configure({
          matchRequestsBy: {
            headers: {
              exclude: ['connection', 'accept', 'accept-encoding', 'user-agent'],
            },
          },
        });
        const script = requireWithPaths(distJS, testModules);
        const logger = logging.createTestLogger();
        const spy = sinon.spy(logger, 'debug');
        const testParams = {
          ...params,
          __ow_logger: logger,
          PSSST: 'secret',
        };
        const res = await script.main(testParams);
        assert.ok(res, 'no response received');
        assert.ok(res.body, 'response has no body');
        testScript.matches.forEach((m) => {
          if (!res.body.match(m)) {
            assert.fail(`response body should contain ${m} but was:\n${res.body}`);
          }
        });
        if (testScript === 'logger_html') {
          assert(spy.calledWith('pre was here!'));
        }
      });
    });
  });
});
