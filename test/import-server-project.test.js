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
import assert from 'assert';
import path from 'path';
import { HelixImportProject } from '../src/server/HelixImportProject.js';

const SPEC_ROOT = path.resolve(__rootdir, 'test', 'specs');

describe('Helix Project', () => {
  it('can set port and bind address', async () => {
    const cwd = path.join(SPEC_ROOT, 'fixtures', 'import');
    const project = await new HelixImportProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .withBindAddr('*')
      .init();

    await project.start();
    try {
      assert.strictEqual(project.started, true);
      assert.notStrictEqual(project.server.port, 0);
      assert.notStrictEqual(project.server.port, 3000);
      assert.strictEqual(project.server.addr, '0.0.0.0');
    } finally {
      await project.stop();
    }
    assert.strictEqual(project.started, false);
  });

  it('can start and stop local project', async () => {
    const cwd = path.join(SPEC_ROOT, 'fixtures', 'import');
    const project = await new HelixImportProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .init();

    await project.start();
    try {
      assert.strictEqual(project.started, true);
    } finally {
      await project.stop();
    }
    assert.strictEqual(project.started, false);
  });
});
