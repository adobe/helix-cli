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
import StatusCommand from '../../src/content/status.cmd.js';
import { makeLogger, setupContentDir } from './content-test-utils.js';

describe('StatusCommand', () => {
  let testRoot;

  beforeEach(async () => {
    testRoot = await createTestRoot();
  });

  afterEach(async () => {
    await fse.remove(testRoot);
  });

  describe('withDirectory', () => {
    it('returns this for chaining', () => {
      const cmd = new StatusCommand(makeLogger());
      assert.strictEqual(cmd.withDirectory('/tmp'), cmd);
    });
  });

  describe('run()', () => {
    it('throws when no .da-config.json found', async () => {
      const cmd = new StatusCommand(makeLogger()).withDirectory(testRoot);
      await assert.rejects(() => cmd.run(), /No config found/);
    });

    it('reports nothing to push when working tree is clean', async () => {
      await setupContentDir(testRoot);
      const log = makeLogger();
      const cmd = new StatusCommand(log).withDirectory(testRoot);
      await cmd.run();

      assert.ok(log.logs.some((l) => l.msg.includes('Nothing to push to da.live')));
    });

    it('reports modified files', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(path.join(contentDir, 'index.html'), '<html><p>changed</p></html>');

      const log = makeLogger();
      const cmd = new StatusCommand(log).withDirectory(testRoot);
      await cmd.run();

      assert.ok(log.logs.some((l) => l.msg.includes('Modified')));
      assert.ok(log.logs.some((l) => l.msg.includes('not committed')));
      assert.ok(log.logs.some((l) => l.msg.includes('/index.html')));
    });

    it('reports added files', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(path.join(contentDir, 'new-page.html'), '<html>new</html>');

      const log = makeLogger();
      const cmd = new StatusCommand(log).withDirectory(testRoot);
      await cmd.run();

      assert.ok(log.logs.some((l) => l.msg.includes('Added')));
      assert.ok(log.logs.some((l) => l.msg.includes('/new-page.html')));
    });

    it('reports deleted files', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.remove(path.join(contentDir, 'index.html'));

      const log = makeLogger();
      const cmd = new StatusCommand(log).withDirectory(testRoot);
      await cmd.run();

      assert.ok(log.logs.some((l) => l.msg.includes('Deleted')));
      assert.ok(log.logs.some((l) => l.msg.includes('/index.html')));
    });

    it('prints org/repo from config', async () => {
      await setupContentDir(testRoot, 'testorg', 'testrepo');
      const log = makeLogger();
      const cmd = new StatusCommand(log).withDirectory(testRoot);
      await cmd.run();

      assert.ok(log.logs.some((l) => l.msg.includes('testorg/testrepo')));
    });

    it('prints summary counts when changes exist', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(path.join(contentDir, 'index.html'), 'changed');
      await fse.writeFile(path.join(contentDir, 'new.html'), 'new');
      await fse.remove(path.join(contentDir, 'blog', 'post.html'));

      const log = makeLogger();
      const cmd = new StatusCommand(log).withDirectory(testRoot);
      await cmd.run();

      const summary = log.logs.find((l) => l.msg.includes('added') && l.msg.includes('modified') && l.msg.includes('deleted'));
      assert.ok(summary);
    });
  });
});
