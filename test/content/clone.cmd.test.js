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
import { makeLogger, createDaClientClass } from './content-test-utils.js';

async function makeCloneCommand(testRoot, DaClientClass) {
  const mod = await esmock('../../src/content/clone.cmd.js', {
    '../../src/git-utils.js': {
      default: {
        getOriginURL: async () => ({ owner: 'myorg', repo: 'myrepo' }),
      },
    },
    '../../src/content/da-auth.js': {
      getValidToken: async () => 'mock-token',
    },
    '../../src/content/da-api.js': {
      DaClient: DaClientClass,
      getContentType: (ext) => `text/${ext}`,
    },
  });
  const Cmd = mod.default;
  return new Cmd(makeLogger()).withDirectory(testRoot);
}

describe('CloneCommand', () => {
  let testRoot;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    await fse.writeFile(path.join(testRoot, '.gitignore'), 'node_modules\n');
  });

  afterEach(async () => {
    await fse.remove(testRoot);
  });

  describe('builder methods', () => {
    it('withDirectory sets _dir', async () => {
      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      assert.strictEqual(cmd._dir, testRoot); // eslint-disable-line no-underscore-dangle
    });

    it('withToken sets _token', async () => {
      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      cmd.withToken('abc');
      assert.strictEqual(cmd._token, 'abc'); // eslint-disable-line no-underscore-dangle
    });

    it('withForce sets _force', async () => {
      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      cmd.withForce(true);
      assert.strictEqual(cmd._force, true); // eslint-disable-line no-underscore-dangle
    });

    it('builder methods return this for chaining', async () => {
      const mod = await esmock('../../src/content/clone.cmd.js', {
        '../../src/git-utils.js': { default: { getOriginURL: async () => null } },
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: createDaClientClass() },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(makeLogger());
      assert.strictEqual(cmd.withDirectory('/tmp'), cmd);
      assert.strictEqual(cmd.withToken('t'), cmd);
      assert.strictEqual(cmd.withForce(false), cmd);
    });
  });

  describe('run()', () => {
    it('throws when no git remote found', async () => {
      const mod = await esmock('../../src/content/clone.cmd.js', {
        '../../src/git-utils.js': {
          default: { getOriginURL: async () => null },
        },
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: createDaClientClass() },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(makeLogger()).withDirectory(testRoot);
      await assert.rejects(() => cmd.run(), /No git remote/);
    });

    it('throws when content dir exists and --force not set', async () => {
      const contentDir = path.join(testRoot, 'aem-content');
      await fse.ensureDir(contentDir);

      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      await assert.rejects(() => cmd.run(), /already exists/);
    });

    it('removes existing content dir when --force is set', async () => {
      const contentDir = path.join(testRoot, 'aem-content');
      await fse.ensureDir(contentDir);
      await fse.writeFile(path.join(contentDir, 'old-file.txt'), 'old');

      const DaClientClass = createDaClientClass({
        files: [{ path: '/myorg/myrepo/index.html', name: 'index.html', ext: 'html' }],
        sourceContent: '<html>hi</html>',
      });
      const cmd = await makeCloneCommand(testRoot, DaClientClass);
      cmd.withForce(true);
      await cmd.run();

      assert.ok(!await fse.pathExists(path.join(contentDir, 'old-file.txt')));
      assert.ok(await fse.pathExists(contentDir));
    });

    it('downloads files into aem-content/', async () => {
      const DaClientClass = createDaClientClass({
        files: [{ path: '/myorg/myrepo/page.html', name: 'page.html', ext: 'html' }],
        sourceContent: '<html>page</html>',
      });
      const cmd = await makeCloneCommand(testRoot, DaClientClass);
      await cmd.run();

      const localPath = path.join(testRoot, 'aem-content', 'page.html');
      assert.ok(await fse.pathExists(localPath));
      const content = await fse.readFile(localPath, 'utf-8');
      assert.strictEqual(content, '<html>page</html>');
    });

    it('writes .da-config.json with org and repo', async () => {
      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      await cmd.run();

      const configPath = path.join(testRoot, 'aem-content', '.da-config.json');
      assert.ok(await fse.pathExists(configPath));
      const config = await fse.readJson(configPath);
      assert.strictEqual(config.org, 'myorg');
      assert.strictEqual(config.repo, 'myrepo');
    });

    it('initializes a git repo in aem-content/', async () => {
      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      await cmd.run();

      const gitDir = path.join(testRoot, 'aem-content', '.git');
      assert.ok(await fse.pathExists(gitDir));
    });

    it('writes .gitignore in aem-content/ excluding .da-config.json', async () => {
      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      await cmd.run();

      const gitIgnorePath = path.join(testRoot, 'aem-content', '.gitignore');
      assert.ok(await fse.pathExists(gitIgnorePath));
      const content = await fse.readFile(gitIgnorePath, 'utf-8');
      assert.ok(content.includes('.da-config.json'));
    });

    it('skips files that return null from getSource', async () => {
      const DaClientClass = createDaClientClass({
        files: [{ path: '/myorg/myrepo/missing.html', name: 'missing.html', ext: 'html' }],
        sourceContent: null,
      });
      const cmd = await makeCloneCommand(testRoot, DaClientClass);
      await cmd.run();

      const localPath = path.join(testRoot, 'aem-content', 'missing.html');
      assert.ok(!await fse.pathExists(localPath));
    });

    it('adds aem-content to project .gitignore', async () => {
      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      await cmd.run();

      const gitIgnorePath = path.join(testRoot, '.gitignore');
      const content = await fse.readFile(gitIgnorePath, 'utf-8');
      assert.ok(content.includes('aem-content'));
    });
  });

  describe('ensureGitIgnored', () => {
    it('adds entry when not present', async () => {
      const mod = await esmock('../../src/content/clone.cmd.js', {
        '../../src/git-utils.js': { default: { getOriginURL: async () => null } },
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: createDaClientClass() },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(makeLogger()).withDirectory(testRoot);
      await cmd.ensureGitIgnored('aem-content');

      const content = await fse.readFile(path.join(testRoot, '.gitignore'), 'utf-8');
      assert.ok(content.includes('aem-content'));
    });

    it('does not duplicate entry when already present', async () => {
      await fse.writeFile(path.join(testRoot, '.gitignore'), 'node_modules\naem-content\n');
      const mod = await esmock('../../src/content/clone.cmd.js', {
        '../../src/git-utils.js': { default: { getOriginURL: async () => null } },
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: createDaClientClass() },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(makeLogger()).withDirectory(testRoot);
      await cmd.ensureGitIgnored('aem-content');

      const content = await fse.readFile(path.join(testRoot, '.gitignore'), 'utf-8');
      const count = content.split('\n').filter((l) => l.trim() === 'aem-content').length;
      assert.strictEqual(count, 1);
    });

    it('creates .gitignore if it does not exist', async () => {
      await fse.remove(path.join(testRoot, '.gitignore'));
      const mod = await esmock('../../src/content/clone.cmd.js', {
        '../../src/git-utils.js': { default: { getOriginURL: async () => null } },
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: createDaClientClass() },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(makeLogger()).withDirectory(testRoot);
      await cmd.ensureGitIgnored('aem-content');

      const content = await fse.readFile(path.join(testRoot, '.gitignore'), 'utf-8');
      assert.ok(content.includes('aem-content'));
    });
  });
});
