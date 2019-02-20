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
const { condit } = require('@adobe/helix-testutils');
const RemotePublishCommand = require('../src/remotepublish.cmd');

describe('hlx publish --remote (Integration)', () => {
  condit('Publish to test service config (no WSK auth, dry-run)', condit.hasenvs(['TEST_FASTLY_AUTH', 'TEST_FASTLY_NAMESPACE', 'VERSION_NUM']), async () => {
    const cmd = await new RemotePublishCommand()
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withDryRun(true)
      .withFastlyAuth(process.env.TEST_FASTLY_AUTH)
      .withFastlyNamespace(process.env.TEST_FASTLY_NAMESPACE);
    await cmd.run();
  }).timeout(60000);

  condit('Publish to test service config', condit.hasenvs(['TEST_FASTLY_AUTH', 'TEST_FASTLY_NAMESPACE', 'VERSION_NUM', 'TEST_WSK_AUTH']), async () => {
    const cmd = await new RemotePublishCommand()
      .withConfigFile(path.resolve(__dirname, 'fixtures/deployed.yaml'))
      .withDryRun(false)
      .withFastlyAuth(process.env.TEST_FASTLY_AUTH)
      .withWskAuth(process.env.TEST_WSK_AUTH)
      .withFastlyNamespace(process.env.TEST_FASTLY_NAMESPACE);
    await cmd.run();
  }).timeout(60000);
});
