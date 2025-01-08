/*
 * Copyright 2025 Adobe. All rights reserved.
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
import fs from 'fs/promises';
import fse from 'fs-extra';
import { UnsecuredJWT } from 'jose';

import path from 'path';
import { getSiteTokenFromFile, saveSiteTokenToFile } from '../src/config/config-utils.js';

describe('.hlx-token', () => {
  afterEach(async () => {
    await fs.rm(path.resolve(__rootdir, '.hlx'), { force: true, recursive: true });
  });

  it('saves token to file', async () => {
    const mockToken = `hlxtst_${new UnsecuredJWT({ email: 'test@example.com' }).encode()}`;
    await saveSiteTokenToFile(mockToken);

    assert.strictEqual(await getSiteTokenFromFile(), mockToken);
  });

  it('does not save invalid token to file', async () => {
    await saveSiteTokenToFile('invalid-token');
    assert.ok(!(await fse.pathExists(path.resolve(__rootdir, '.hlx', '.hlx-token'))));
  });

  it('does not save invalid non JWT TST token to file', async () => {
    await saveSiteTokenToFile('hlxtst_invalid-token');
    assert.ok(!(await fse.pathExists(path.resolve(__rootdir, '.hlx', '.hlx-token'))));
  });

  it('does not save null token to file', async () => {
    await saveSiteTokenToFile(null);
    assert.ok(!(await fse.pathExists(path.resolve(__rootdir, '.hlx', '.hlx-token'))));
  });

  it('does not throw if token file does not exist, returns null', async () => {
    assert.strictEqual(await getSiteTokenFromFile(), null);
  });

  it('invalid file format does not throw, returns null', async () => {
    await fs.mkdir(path.resolve(__rootdir, '.hlx'));
    await fs.writeFile(path.resolve(__rootdir, '.hlx', '.hlx-token'), 'this-is-a-token');
    assert.strictEqual(await getSiteTokenFromFile(), null);
  });
});
