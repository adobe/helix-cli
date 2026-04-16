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

async function makeDiffCommand(testRoot, DaClientClass) {
  const mod = await esmock('../../src/content/diff.cmd.js', {
    '../../src/content/da-auth.js': { getValidToken: async () => 'mock-token' },
    '../../src/content/da-api.js': { DaClient: DaClientClass },
  });
  const Cmd = mod.default;
  return new Cmd(makeLogger()).withDirectory(testRoot);
}

describe('DiffCommand', () => {
  let testRoot;

  beforeEach(async () => {
    testRoot = await createTestRoot();
  });

  afterEach(async () => {
    await fse.remove(testRoot);
  });

  describe('builder methods', () => {
    it('withDirectory returns this', async () => {
      const cmd = await makeDiffCommand(testRoot, createDaClientClass());
      assert.strictEqual(cmd.withDirectory('/tmp'), cmd);
    });

    it('withToken returns this', async () => {
      const cmd = await makeDiffCommand(testRoot, createDaClientClass());
      assert.strictEqual(cmd.withToken('t'), cmd);
    });

    it('withFilePath returns this', async () => {
      const cmd = await makeDiffCommand(testRoot, createDaClientClass());
      assert.strictEqual(cmd.withFilePath('/file.html'), cmd);
    });

    it('withFilePath stores null for falsy values', async () => {
      const cmd = await makeDiffCommand(testRoot, createDaClientClass());
      cmd.withFilePath(undefined);
      assert.strictEqual(cmd._filePath, null); // eslint-disable-line no-underscore-dangle
    });
  });

  describe('run()', () => {
    it('throws when no config found', async () => {
      const cmd = await makeDiffCommand(testRoot, createDaClientClass());
      await assert.rejects(() => cmd.run(), /No config found/);
    });

    it('reports no changes when working tree is clean', async () => {
      await setupContentDir(testRoot);
      const log = makeLogger();
      const mod = await esmock('../../src/content/diff.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: createDaClientClass() },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot);
      await cmd.run();

      assert.ok(log.logs.some((l) => l.msg.includes('Nothing to diff')));
      assert.ok(log.logs.some((l) => l.msg.includes('last commit')));
    });

    it('reports no changes for specific file when unmodified', async () => {
      await setupContentDir(testRoot);
      const log = makeLogger();
      const mod = await esmock('../../src/content/diff.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: createDaClientClass() },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(log).withDirectory(testRoot).withFilePath('/index.html');
      await cmd.run();

      assert.ok(log.logs.some((l) => l.msg.includes('No local changes detected')));
    });

    it('does not throw when file path lacks leading slash', async () => {
      await setupContentDir(testRoot);
      const mod = await esmock('../../src/content/diff.cmd.js', {
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: createDaClientClass() },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(makeLogger()).withDirectory(testRoot).withFilePath('index.html');
      await cmd.run();
    });

    it('generates a diff for modified files', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(
        path.join(contentDir, 'index.html'),
        '<html><p>local change</p></html>',
      );

      const written = [];
      const origWrite = process.stdout.write.bind(process.stdout);
      process.stdout.write = (s) => {
        written.push(s);
        return true;
      };

      try {
        const DaClientClass = createDaClientClass({
          sourceContent: '<html><p>remote</p></html>',
        });
        const mod = await esmock('../../src/content/diff.cmd.js', {
          '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
          '../../src/content/da-api.js': { DaClient: DaClientClass },
        });
        const Cmd = mod.default;
        const cmd = new Cmd(makeLogger()).withDirectory(testRoot);
        await cmd.run();
      } finally {
        process.stdout.write = origWrite;
      }

      const output = written.join('');
      assert.ok(output.includes('@@') || output.includes('---') || output.includes('+++'));
    });

    it('handles null remote content gracefully', async () => {
      const contentDir = await setupContentDir(testRoot);
      await fse.writeFile(path.join(contentDir, 'index.html'), '<html>new content</html>');

      const written = [];
      const origWrite = process.stdout.write.bind(process.stdout);
      process.stdout.write = (s) => {
        written.push(s);
        return true;
      };

      try {
        const DaClientClass = createDaClientClass({ sourceContent: null });
        const mod = await esmock('../../src/content/diff.cmd.js', {
          '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
          '../../src/content/da-api.js': { DaClient: DaClientClass },
        });
        const Cmd = mod.default;
        const cmd = new Cmd(makeLogger()).withDirectory(testRoot);
        await cmd.run();
      } finally {
        process.stdout.write = origWrite;
      }
    });
  });
});
