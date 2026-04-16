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
import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import git from 'isomorphic-git';
import { createTestRoot } from '../utils.js';
import AddCommand, {
  filepathInContentAddScope,
  normalizePathForContentAdd,
} from '../../src/content/add.cmd.js';
import { makeLogger, setupContentDir } from './content-test-utils.js';

describe('normalizePathForContentAdd', () => {
  it('strips content/ prefix', () => {
    assert.strictEqual(normalizePathForContentAdd('content/index.html'), 'index.html');
    assert.strictEqual(normalizePathForContentAdd('content/blog/post.html'), 'blog/post.html');
  });

  it('strips ./content/ prefix', () => {
    assert.strictEqual(normalizePathForContentAdd('./content/foo.html'), 'foo.html');
  });

  it('maps content or content/ to .', () => {
    assert.strictEqual(normalizePathForContentAdd('content'), '.');
    assert.strictEqual(normalizePathForContentAdd('content/'), '.');
  });

  it('normalizes backslashes before stripping prefix', () => {
    assert.strictEqual(normalizePathForContentAdd('content\\dir\\a.txt'), 'dir/a.txt');
  });

  it('leaves repo-relative paths unchanged', () => {
    assert.strictEqual(normalizePathForContentAdd('index.html'), 'index.html');
    assert.strictEqual(normalizePathForContentAdd('.'), '.');
  });
});

describe('filepathInContentAddScope', () => {
  it('treats . as whole tree', () => {
    assert.strictEqual(filepathInContentAddScope('blog/post.html', '.'), true);
    assert.strictEqual(filepathInContentAddScope('index.html', '.'), true);
  });

  it('matches exact file and directory prefix', () => {
    assert.strictEqual(filepathInContentAddScope('blog/post.html', 'blog'), true);
    assert.strictEqual(filepathInContentAddScope('blog/post.html', 'blog/'), true);
    assert.strictEqual(filepathInContentAddScope('blog', 'blog'), true);
    assert.strictEqual(filepathInContentAddScope('blogging/readme.md', 'blog'), false);
  });
});

describe('AddCommand', () => {
  let testRoot;

  beforeEach(async () => {
    testRoot = await createTestRoot();
  });

  afterEach(async () => {
    await fse.remove(testRoot);
  });

  describe('run()', () => {
    it('stages deletion when adding . after removing a tracked file', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.remove(path.join(contentDir, 'index.html'));

      const cmd = new AddCommand(makeLogger()).withDirectory(testRoot).withPaths(['.']);
      await cmd.run();

      const matrix = await git.statusMatrix({ fs, dir: contentDir });
      const row = matrix.find((r) => r[0] === 'index.html');
      assert.ok(row);
      assert.strictEqual(row[1], 1);
      assert.strictEqual(row[2], 0);
      assert.strictEqual(row[3], 0);
    });

    it('stages deletion when adding a removed file path', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.remove(path.join(contentDir, 'index.html'));

      const cmd = new AddCommand(makeLogger()).withDirectory(testRoot).withPaths(['index.html']);
      await cmd.run();

      const matrix = await git.statusMatrix({ fs, dir: contentDir });
      const row = matrix.find((r) => r[0] === 'index.html');
      assert.ok(row);
      assert.strictEqual(row[3], 0);
    });

    it('rethrows when add path is missing and not a tracked deletion', async () => {
      await setupContentDir(testRoot);
      const cmd = new AddCommand(makeLogger()).withDirectory(testRoot).withPaths(['no-such-file.html']);
      await assert.rejects(() => cmd.run(), /NotFoundError/);
    });
  });
});
