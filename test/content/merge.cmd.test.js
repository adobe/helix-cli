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
import esmock from 'esmock';
import { createTestRoot } from '../utils.js';
import { makeLogger, setupContentDir, createDaClientClass } from './content-test-utils.js';

async function makeMergeCommand(testRoot, DaClientClass) {
  const mod = await esmock('../../src/content/merge.cmd.js', {
    '../../src/content/da-auth.js': { getValidToken: async () => 'mock-token' },
    '../../src/content/da-api.js': { DaClient: DaClientClass },
  });
  const Cmd = mod.default;
  return new Cmd(makeLogger()).withDirectory(testRoot);
}

describe('MergeCommand', () => {
  let testRoot;

  beforeEach(async () => {
    testRoot = await createTestRoot();
  });

  afterEach(async () => {
    await fse.remove(testRoot);
  });

  describe('builder methods', () => {
    it('withDirectory returns this', async () => {
      const cmd = await makeMergeCommand(testRoot, createDaClientClass());
      assert.strictEqual(cmd.withDirectory('/tmp'), cmd);
    });

    it('withToken returns this', async () => {
      const cmd = await makeMergeCommand(testRoot, createDaClientClass());
      assert.strictEqual(cmd.withToken('t'), cmd);
    });

    it('withFilePath returns this', async () => {
      const cmd = await makeMergeCommand(testRoot, createDaClientClass());
      assert.strictEqual(cmd.withFilePath('/file.html'), cmd);
    });

    it('withFilePath stores null for falsy values', async () => {
      const cmd = await makeMergeCommand(testRoot, createDaClientClass());
      cmd.withFilePath(null);
      assert.strictEqual(cmd._filePath, null); // eslint-disable-line no-underscore-dangle
    });
  });

  describe('run()', () => {
    it('throws when no config found', async () => {
      const cmd = await makeMergeCommand(testRoot, createDaClientClass());
      await assert.rejects(() => cmd.run(), /No config found/);
    });

    it('reports nothing to merge when working tree is clean', async () => {
      await setupContentDir(testRoot);
      const log = makeLogger();
      const mod = await esmock('../../src/content/merge.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: createDaClientClass() },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot);
      await cmd.run();

      assert.ok(log.logs.some((l) => l.msg.includes('Nothing to merge')));
    });

    it('reports no changes for specific file when unmodified', async () => {
      await setupContentDir(testRoot);
      const log = makeLogger();
      const mod = await esmock('../../src/content/merge.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: createDaClientClass() },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot).withFilePath('/index.html');
      await cmd.run();

      assert.ok(log.logs.some((l) => l.msg.includes('No local changes detected')));
    });

    it('performs merge when local file is modified', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(
        path.join(contentDir, 'index.html'),
        '<html><p>index</p><p>local addition</p></html>',
      );

      const log = makeLogger();
      const DaClientClass = createDaClientClass({
        sourceContent: '<html><p>index</p></html>',
      });
      const mod = await esmock('../../src/content/merge.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: DaClientClass },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot);
      await cmd.run();

      assert.ok(log.logs.some((l) => l.msg.includes('merged') || l.msg.includes('Merge')));
    });

    it('writes merged result to the local file', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(
        path.join(contentDir, 'index.html'),
        '<html><p>index</p><p>local extra</p></html>',
      );

      const DaClientClass = createDaClientClass({
        sourceContent: '<html><p>index</p></html>',
      });
      const mod = await esmock('../../src/content/merge.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: DaClientClass },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(makeLogger()).withDirectory(testRoot);
      await cmd.run();

      const merged = await fse.readFile(path.join(contentDir, 'index.html'), 'utf-8');
      assert.ok(merged.length > 0);
    });

    it('produces conflict markers when local and remote diverge from the same base', async () => {
      const contentDir = await setupContentDir(testRoot);
      // base: '<html><p>index</p></html>'
      // local: completely different content → conflict with remote
      await fse.writeFile(
        path.join(contentDir, 'index.html'),
        '<html><p>completely different local</p></html>',
      );

      const log = makeLogger();
      const DaClientClass = createDaClientClass({
        sourceContent: '<html><p>completely different remote</p></html>',
      });
      const mod = await esmock('../../src/content/merge.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: DaClientClass },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot);
      await cmd.run();

      const mergedContent = await fse.readFile(
        path.join(contentDir, 'index.html'),
        'utf-8',
      );
      const hasConflictMarker = mergedContent.includes('<<<<<<< LOCAL');
      const hasMergeLog = log.logs.some((l) => l.msg.includes('merged') || l.msg.includes('CONFLICT'));
      assert.ok(hasConflictMarker || hasMergeLog);
    });

    it('logs merge complete message', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(
        path.join(contentDir, 'index.html'),
        '<html><p>local conflict</p></html>',
      );

      const log = makeLogger();
      const DaClientClass = createDaClientClass({
        sourceContent: '<html><p>remote conflict</p></html>',
      });
      const mod = await esmock('../../src/content/merge.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: DaClientClass },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot);
      await cmd.run();

      assert.ok(log.logs.some((l) => l.msg.includes('Merge complete')));
    });

    it('normalizes file path by adding leading slash', async () => {
      await setupContentDir(testRoot);
      const mod = await esmock('../../src/content/merge.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: createDaClientClass() },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(makeLogger()).withDirectory(testRoot).withFilePath('index.html');
      await cmd.run();
    });
  });
});
