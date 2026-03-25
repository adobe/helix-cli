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
import esmock from 'esmock';
import { createTestRoot } from '../utils.js';
import {
  makeLogger,
  setupContentDir,
  createDaClientClass,
  stageAllAndCommit,
} from './content-test-utils.js';

async function makePushCommand(testRoot, DaClientClass) {
  const mod = await esmock('../../src/content/push.cmd.js', {
    '../../src/content/da-auth.js': { getValidToken: async () => 'mock-token' },
    '../../src/content/da-api.js': {
      DaClient: DaClientClass,
      getContentType: () => 'text/html',
    },
  });
  const Cmd = mod.default;
  return new Cmd(makeLogger()).withDirectory(testRoot);
}

describe('PushCommand', () => {
  let testRoot;

  beforeEach(async () => {
    testRoot = await createTestRoot();
  });

  afterEach(async () => {
    await fse.remove(testRoot);
  });

  describe('builder methods', () => {
    it('withToken returns this', async () => {
      const cmd = await makePushCommand(testRoot, createDaClientClass());
      assert.strictEqual(cmd.withToken('t'), cmd);
    });

    it('withForce returns this', async () => {
      const cmd = await makePushCommand(testRoot, createDaClientClass());
      assert.strictEqual(cmd.withForce(true), cmd);
    });

    it('withDryRun returns this', async () => {
      const cmd = await makePushCommand(testRoot, createDaClientClass());
      assert.strictEqual(cmd.withDryRun(true), cmd);
    });

    it('withPath returns this', async () => {
      const cmd = await makePushCommand(testRoot, createDaClientClass());
      assert.strictEqual(cmd.withPath('/blog'), cmd);
    });

    it('withPath stores null for falsy values', async () => {
      const cmd = await makePushCommand(testRoot, createDaClientClass());
      cmd.withPath(undefined);
      assert.strictEqual(cmd._pushPath, null); // eslint-disable-line no-underscore-dangle
    });
  });

  describe('run()', () => {
    it('throws when no config found', async () => {
      const cmd = await makePushCommand(testRoot, createDaClientClass());
      await assert.rejects(() => cmd.run(), /No config found/);
    });

    it('reports nothing to push when working tree is clean', async () => {
      await setupContentDir(testRoot);
      const log = makeLogger();
      const mod = await esmock('../../src/content/push.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': {
          DaClient: createDaClientClass(),
          getContentType: () => 'text/html',
        },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot);
      await cmd.run();

      assert.ok(log.logs.some((l) => l.msg.includes('Nothing to push')));
      assert.ok(log.logs.some((l) => l.msg.includes('last da.live sync')));
    });

    it('rejects push when there are uncommitted changes', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(path.join(contentDir, 'index.html'), 'changed');

      const cmd = await makePushCommand(testRoot, createDaClientClass());
      await assert.rejects(() => cmd.run(), /uncommitted changes/);
    });

    it('dry-run shows what would be pushed without pushing', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(path.join(contentDir, 'index.html'), 'changed');
      await stageAllAndCommit(contentDir, 'edit index');

      let putCalled = false;
      const DaClientClass = createDaClientClass({
        onPut: () => {
          putCalled = true;
        },
      });

      const log = makeLogger();
      const mod = await esmock('../../src/content/push.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': {
          DaClient: DaClientClass,
          getContentType: () => 'text/html',
        },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot).withDryRun(true);
      await cmd.run();

      assert.strictEqual(putCalled, false);
      assert.ok(log.logs.some((l) => l.msg.includes('Dry run')));
    });

    it('aborts on conflict without --force', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(path.join(contentDir, 'index.html'), 'changed');
      await stageAllAndCommit(contentDir, 'edit index');

      // Remote modified time is in the future (more recent than our last sync)
      const DaClientClass = createDaClientClass({ remoteLastModified: Date.now() + 60_000 });
      const log = makeLogger();
      const mod = await esmock('../../src/content/push.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': {
          DaClient: DaClientClass,
          getContentType: () => 'text/html',
        },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot);
      await cmd.run();

      assert.ok(log.logs.some((l) => l.msg.includes('Conflicts') || l.msg.includes('aborted')));
    });

    it('pushes despite conflict when --force is set', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(path.join(contentDir, 'index.html'), 'changed');
      await stageAllAndCommit(contentDir, 'edit index');

      let putCalled = false;
      const DaClientClass = createDaClientClass({
        remoteLastModified: Date.now() + 60_000,
        onPut: () => { putCalled = true; },
      });
      const log = makeLogger();
      const mod = await esmock('../../src/content/push.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': {
          DaClient: DaClientClass,
          getContentType: () => 'text/html',
        },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot).withForce(true);
      await cmd.run();

      assert.strictEqual(putCalled, true);
    });

    it('pushes modified files to da.live', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(path.join(contentDir, 'index.html'), 'changed content');
      await stageAllAndCommit(contentDir, 'edit index');

      const pushed = [];
      const DaClientClass = createDaClientClass({ onPut: (p) => pushed.push(p) });
      const log = makeLogger();
      const mod = await esmock('../../src/content/push.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': {
          DaClient: DaClientClass,
          getContentType: () => 'text/html',
        },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot);
      await cmd.run();

      assert.ok(pushed.includes('/index.html'));
    });

    it('deletes removed files from da.live', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.remove(path.join(contentDir, 'index.html'));
      await git.remove({ fs, dir: contentDir, filepath: 'index.html' });
      await stageAllAndCommit(contentDir, 'drop index');

      const deleted = [];
      const DaClientClass = createDaClientClass({ onDelete: (p) => deleted.push(p) });
      const log = makeLogger();
      const mod = await esmock('../../src/content/push.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': {
          DaClient: DaClientClass,
          getContentType: () => 'text/html',
        },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot);
      await cmd.run();

      assert.ok(deleted.includes('/index.html'));
    });

    it('only pushes files matching --path filter', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(path.join(contentDir, 'index.html'), 'changed');
      await fse.writeFile(path.join(contentDir, 'blog', 'post.html'), 'changed blog');
      await stageAllAndCommit(contentDir, 'edit pages');

      const pushed = [];
      const DaClientClass = createDaClientClass({ onPut: (p) => pushed.push(p) });
      const log = makeLogger();
      const mod = await esmock('../../src/content/push.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': {
          DaClient: DaClientClass,
          getContentType: () => 'text/html',
        },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot).withPath('/blog');
      await cmd.run();

      assert.ok(pushed.includes('/blog/post.html'));
      assert.ok(!pushed.includes('/index.html'));
    });

    it('shows dry-run added/modified/deleted sections', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(path.join(contentDir, 'index.html'), 'changed');
      await fse.writeFile(path.join(contentDir, 'new.html'), 'new');
      await fse.remove(path.join(contentDir, 'blog', 'post.html'));
      await git.remove({ fs, dir: contentDir, filepath: 'blog/post.html' });
      await stageAllAndCommit(contentDir, 'mixed changes');

      const log = makeLogger();
      const mod = await esmock('../../src/content/push.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': {
          DaClient: createDaClientClass(),
          getContentType: () => 'text/html',
        },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot).withDryRun(true);
      await cmd.run();

      const allMsgs = log.logs.map((l) => l.msg).join('\n');
      assert.ok(
        allMsgs.includes('Would update')
        || allMsgs.includes('Would add')
        || allMsgs.includes('Would delete'),
      );
    });
  });
});
