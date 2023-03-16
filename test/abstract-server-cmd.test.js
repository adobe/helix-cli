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
import esmock from 'esmock';
import { AbstractServerCommand } from '../src/abstract-server.cmd.js';

describe('AbstractServerCommand test', () => {
  it('open rejects invalid path argument', async () => {
    const cmd = new AbstractServerCommand();
    // eslint-disable-next-line no-underscore-dangle
    cmd._project = { server: { hostname: 'localhost', scheme: 'http', port: 3000 } };
    await assert.rejects(cmd.open('foo'), Error('invalid argument for --open. either provide an relative url starting with \'/\' or an absolute http(s) url.'));
  });

  it('open rejects invalid scheme argument', async () => {
    const cmd = new AbstractServerCommand();
    // eslint-disable-next-line no-underscore-dangle
    cmd._project = { server: { hostname: 'localhost', scheme: 'http', port: 3000 } };
    await assert.rejects(cmd.open('file://etc/passwd'), Error('refuse to open non http(s) url (--open): file://etc/passwd'));
  });

  it('constructs valid url from path', async () => {
    let opened;
    const { AbstractServerCommand: MockedCommand } = await esmock('../src/abstract-server.cmd.js', {
      open: (url) => {
        opened = url;
      },
    });
    const cmd = new MockedCommand();
    // eslint-disable-next-line no-underscore-dangle
    cmd._project = { server: { hostname: 'localhost', scheme: 'http', port: 3000 } };
    await cmd.open('/"; Start calc.exe; echo "foo');
    assert.strictEqual(opened, 'http://localhost:3000/%22;%20Start%20calc.exe;%20echo%20%22foo');
  });
});
