/*
 * Copyright 2026 Adobe. All rights reserved.
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
import fse from 'fs-extra';
import { createTestRoot } from '../utils.js';
import { ensureGitIgnored } from '../../src/content/content-git.js';

describe('ensureGitIgnored', () => {
  let testRoot;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    await fse.writeFile(path.join(testRoot, '.gitignore'), 'node_modules\n');
  });

  afterEach(async () => {
    await fse.remove(testRoot);
  });

  it('adds entry when not present', async () => {
    await ensureGitIgnored(testRoot, 'content');
    const content = await fse.readFile(path.join(testRoot, '.gitignore'), 'utf-8');
    assert.ok(content.includes('content'));
  });

  it('does not duplicate entry when already present', async () => {
    await fse.writeFile(path.join(testRoot, '.gitignore'), 'node_modules\ncontent\n');
    await ensureGitIgnored(testRoot, 'content');
    const content = await fse.readFile(path.join(testRoot, '.gitignore'), 'utf-8');
    const count = content.split('\n').filter((l) => l.trim() === 'content').length;
    assert.strictEqual(count, 1);
  });

  it('creates .gitignore if it does not exist', async () => {
    await fse.remove(path.join(testRoot, '.gitignore'));
    await ensureGitIgnored(testRoot, 'content');
    const content = await fse.readFile(path.join(testRoot, '.gitignore'), 'utf-8');
    assert.ok(content.includes('content'));
  });
});
