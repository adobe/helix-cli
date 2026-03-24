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
import { normalizeDaPath, CONTENT_DIR, LARGE_CLONE_FILE_THRESHOLD } from '../../src/content/content-shared.js';

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

    it('withRootPath sets _rootPath', async () => {
      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      cmd.withRootPath('/ca/fr_ca');
      assert.strictEqual(cmd._rootPath, '/ca/fr_ca'); // eslint-disable-line no-underscore-dangle
    });

    it('withAssumeYes sets _assumeYes', async () => {
      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      cmd.withAssumeYes(true);
      assert.strictEqual(cmd._assumeYes, true); // eslint-disable-line no-underscore-dangle
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
      assert.strictEqual(cmd.withRootPath('/'), cmd);
      assert.strictEqual(cmd.withAssumeYes(false), cmd);
    });
  });

  describe('normalizeDaPath()', () => {
    it('adds leading slash and strips trailing slashes', () => {
      assert.strictEqual(normalizeDaPath('ca/fr_ca/'), '/ca/fr_ca');
      assert.strictEqual(normalizeDaPath('/a/b/'), '/a/b');
    });

    it('preserves root', () => {
      assert.strictEqual(normalizeDaPath('/'), '/');
      assert.strictEqual(normalizeDaPath('///'), '/');
    });

    it('rejects empty input', () => {
      assert.throws(() => normalizeDaPath(''), /empty/);
      assert.throws(() => normalizeDaPath('   '), /empty/);
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
      const cmd = new Cmd(makeLogger()).withDirectory(testRoot).withRootPath('/');
      await assert.rejects(() => cmd.run(), /No git remote/);
    });

    it('throws when run without withRootPath', async () => {
      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      await assert.rejects(() => cmd.run(), /root path was not set/);
    });

    it('throws when content dir exists and --force not set', async () => {
      const contentDir = path.join(testRoot, CONTENT_DIR);
      await fse.ensureDir(contentDir);

      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      cmd.withRootPath('/');
      await assert.rejects(() => cmd.run(), /already exists/);
    });

    it('removes existing content dir when --force is set', async () => {
      const contentDir = path.join(testRoot, CONTENT_DIR);
      await fse.ensureDir(contentDir);
      await fse.writeFile(path.join(contentDir, 'old-file.txt'), 'old');

      const DaClientClass = createDaClientClass({
        files: [{ path: '/myorg/myrepo/index.html', name: 'index.html', ext: 'html' }],
        sourceContent: '<html>hi</html>',
      });
      const cmd = await makeCloneCommand(testRoot, DaClientClass);
      cmd.withForce(true).withRootPath('/');
      await cmd.run();

      assert.ok(!await fse.pathExists(path.join(contentDir, 'old-file.txt')));
      assert.ok(await fse.pathExists(contentDir));
    });

    it('downloads files into content/', async () => {
      const DaClientClass = createDaClientClass({
        files: [{ path: '/myorg/myrepo/page.html', name: 'page.html', ext: 'html' }],
        sourceContent: '<html>page</html>',
      });
      const cmd = await makeCloneCommand(testRoot, DaClientClass);
      cmd.withRootPath('/');
      await cmd.run();

      const localPath = path.join(testRoot, CONTENT_DIR, 'page.html');
      assert.ok(await fse.pathExists(localPath));
      const content = await fse.readFile(localPath, 'utf-8');
      assert.strictEqual(content, '<html>page</html>');
    });

    it('writes .da-config.json with org, repo, and rootPath', async () => {
      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      cmd.withRootPath('/blog');
      await cmd.run();

      const configPath = path.join(testRoot, CONTENT_DIR, '.da-config.json');
      assert.ok(await fse.pathExists(configPath));
      const config = await fse.readJson(configPath);
      assert.strictEqual(config.org, 'myorg');
      assert.strictEqual(config.repo, 'myrepo');
      assert.strictEqual(config.rootPath, '/blog');
    });

    it('initializes a git repo in content/', async () => {
      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      cmd.withRootPath('/');
      await cmd.run();

      const gitDir = path.join(testRoot, CONTENT_DIR, '.git');
      assert.ok(await fse.pathExists(gitDir));
    });

    it('writes .gitignore in content/ excluding .da-config.json', async () => {
      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      cmd.withRootPath('/');
      await cmd.run();

      const gitIgnorePath = path.join(testRoot, CONTENT_DIR, '.gitignore');
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
      cmd.withRootPath('/');
      await cmd.run();

      const localPath = path.join(testRoot, CONTENT_DIR, 'missing.html');
      assert.ok(!await fse.pathExists(localPath));
    });

    it('adds content to project .gitignore', async () => {
      const cmd = await makeCloneCommand(testRoot, createDaClientClass());
      cmd.withRootPath('/');
      await cmd.run();

      const gitIgnorePath = path.join(testRoot, '.gitignore');
      const content = await fse.readFile(gitIgnorePath, 'utf-8');
      assert.ok(content.includes(CONTENT_DIR));
    });

    it('passes root path to listAll', async () => {
      let listedAt;
      const DaClientClass = createDaClientClass({
        files: [{ path: '/myorg/myrepo/ca/fr_ca/page.html', name: 'page.html', ext: 'html' }],
        sourceContent: '<html>x</html>',
        onListAll: (org, repo, daPath) => {
          listedAt = daPath;
        },
      });
      const cmd = await makeCloneCommand(testRoot, DaClientClass);
      cmd.withRootPath('/ca/fr_ca');
      await cmd.run();
      assert.strictEqual(listedAt, '/ca/fr_ca');
      assert.ok(await fse.pathExists(path.join(testRoot, CONTENT_DIR, 'ca', 'fr_ca', 'page.html')));
    });

    it('refuses large clone without --yes when not interactive', async () => {
      const prevIn = process.stdin.isTTY;
      const prevOut = process.stdout.isTTY;
      process.stdin.isTTY = false;
      process.stdout.isTTY = false;
      try {
        const n = LARGE_CLONE_FILE_THRESHOLD + 1;
        const files = Array.from({ length: n }, (_, i) => ({
          path: `/myorg/myrepo/f${i}.html`,
          name: `f${i}.html`,
          ext: 'html',
        }));
        const DaClientClass = createDaClientClass({
          files,
          sourceContent: '<html/>',
        });
        const cmd = await makeCloneCommand(testRoot, DaClientClass);
        cmd.withRootPath('/');
        await assert.rejects(() => cmd.run(), /needs confirmation/);
        assert.ok(!await fse.pathExists(path.join(testRoot, CONTENT_DIR)));
      } finally {
        process.stdin.isTTY = prevIn;
        process.stdout.isTTY = prevOut;
      }
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
      await cmd.ensureGitIgnored(CONTENT_DIR);

      const content = await fse.readFile(path.join(testRoot, '.gitignore'), 'utf-8');
      assert.ok(content.includes(CONTENT_DIR));
    });

    it('does not duplicate entry when already present', async () => {
      await fse.writeFile(path.join(testRoot, '.gitignore'), `node_modules\n${CONTENT_DIR}\n`);
      const mod = await esmock('../../src/content/clone.cmd.js', {
        '../../src/git-utils.js': { default: { getOriginURL: async () => null } },
        '../../src/content/da-auth.js': { getValidToken: async () => 'token' },
        '../../src/content/da-api.js': { DaClient: createDaClientClass() },
      });
      const Cmd = mod.default;
      const cmd = new Cmd(makeLogger()).withDirectory(testRoot);
      await cmd.ensureGitIgnored(CONTENT_DIR);

      const content = await fse.readFile(path.join(testRoot, '.gitignore'), 'utf-8');
      const count = content.split('\n').filter((l) => l.trim() === CONTENT_DIR).length;
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
      await cmd.ensureGitIgnored(CONTENT_DIR);

      const content = await fse.readFile(path.join(testRoot, '.gitignore'), 'utf-8');
      assert.ok(content.includes(CONTENT_DIR));
    });
  });
});
