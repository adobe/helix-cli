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

const querystring = require('querystring');
const assert = require('assert');
const fs = require('fs-extra');
const sinon = require('sinon');
const { Request } = require('@adobe/helix-fetch');
const { logging } = require('@adobe/helix-testutils');
const {
  processSource, getTestModules, requireWithPaths, setupPolly,
} = require('./utils');

const DEFAULT_PARAMS = {
  path: '/hello.md',
  owner: 'trieloff',
  repo: 'soupdemo',
  ref: 'master',
  selector: 'md',
  branch: 'master',
};

const DEFAULT_ENV = {
  SECRET: '🎶 agent man',
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
        const res = await script.main(new Request(`https://anywhere.run/foo?${querystring.encode(DEFAULT_PARAMS)}`), {
          log: logger,
          env: {
            PSSST: 'secret',
            ...DEFAULT_ENV,
          },
        });
        assert.ok(res, 'no response received');
        assert.ok(res.body, 'response has no body');
        const body = await res.text();
        testScript.matches.forEach((m) => {
          if (!body.match(m)) {
            assert.fail(`response body should contain ${m} but was:\n${body}`);
          }
        });
        if (testScript === 'logger_html') {
          assert(spy.calledWith('pre was here!'));
        }
      });
    });
  });
});
