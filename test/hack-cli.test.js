/*
 * Copyright 2019 Adobe. All rights reserved.
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
import assert from 'assert';
import { logging } from '@adobe/helix-testutils';
import esmock from 'esmock';
import hack from '../src/hack.js';
import CLI from '../src/cli.js';
import HackCommand from '../src/hack.cmd.js';

describe('Test hlx hack', () => {
  it('hlx hack works', async () => {
    assert.equal(typeof hack(), 'object');
    const result = await new CLI().run(['hack', '--open=false']);
    assert.equal(result, undefined);

    assert.equal(hack().executor = null, undefined);

    const hackathon = '5-bsl';
    const logger = logging.createTestLogger();
    await new HackCommand(logger)
      .withHackathon(hackathon)
      .withOpen(false)
      .run();
    const log = logger.getOutput();
    assert.ok(log.indexOf(`/hackathons/${hackathon}.md`) > 0);
  });

  it('hlx hack opens browser', async () => {
    let opened;
    const MockedCommand = await esmock('../src/hack.cmd.js', {
      open: (url) => {
        opened = url;
      },
    });
    await new MockedCommand()
      .withHackathon('test$(calc.exe)test')
      .withOpen(true)
      .run();
    assert.strictEqual(opened, 'https://github.com/adobe/helix-home/tree/main/hackathons/test%24(calc.exe)test.md');
  });
});
