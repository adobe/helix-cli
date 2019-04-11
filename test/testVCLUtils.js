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
const path = require('path');
const assert = require('assert');
const fs = require('fs-extra');
const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const FSPersister = require('@pollyjs/persister-fs');
const { setupMocha: setupPolly } = require('@pollyjs/core');
const { Logger } = require('@adobe/helix-shared');
const PublishCommand = require('../src/publish.cmd');
const { reset } = require('../src/fastly/vcl-utils');

describe('Test VCL utils', () => {
  setupPolly({
    recordFailedRequests: true,
    recordIfMissing: false,
    logging: false,
    adapters: [NodeHttpAdapter],
    persister: FSPersister,
    persisterOptions: {
      fs: {
        recordingsDir: path.resolve(__dirname, 'fixtures/recordings'),
      },
    },
    matchRequestsBy: {
      headers: {
        exclude: ['user-agent'],
      },
    },
  });

  it('initFastly generates new backends for defined Proxies', async () => {
    const strainfile = path.resolve(__dirname, 'fixtures/proxystrains.yaml');
    const cmd = new PublishCommand(Logger.getTestLogger()).withConfigFile(strainfile);
    try {
      await cmd.init();
      await cmd.initFastly();
    } catch (e) {
      // we expect initFastly to fail
      assert.equal(e.statusCode, 401);
    }
    /* eslint-disable-next-line no-underscore-dangle */
    assert.equal(reset(cmd._backends), fs.readFileSync(path.resolve(__dirname, 'fixtures/reset-proxystrains.vcl')).toString());
  });
});
