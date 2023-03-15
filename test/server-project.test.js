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
import { HelixProject } from '../src/server/HelixProject.js';

const SPEC_ROOT = path.resolve(__rootdir, 'test', 'specs');

describe('Helix Project', () => {
  it('can set port', async () => {
    const cwd = path.join(SPEC_ROOT, 'fixtures', 'project');
    const project = await new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .init();

    await project.start();
    assert.equal(true, project.started);
    assert.notEqual(project.server.port, 0);
    assert.notEqual(project.server.port, 3000);
    await project.stop();
    assert.equal(false, project.started);
  });

  it('can start and stop local project', async () => {
    const cwd = path.join(SPEC_ROOT, 'fixtures', 'project');
    const project = await new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .init();

    await project.start();
    assert.equal(true, project.started);
    await project.stop();
    assert.equal(false, project.started);
  });
});
