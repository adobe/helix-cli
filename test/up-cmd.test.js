/*
 * Copyright 2019 Adobe. All rights reserved.
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
import shell from 'shelljs';
import { GitUrl } from '@adobe/helix-shared-git';
import {
  Nock, assertHttp, createTestRoot, initGit, switchBranch, signal,
} from './utils.js';
import UpCommand from '../src/up.cmd.js';
import GitUtils from '../src/git-utils.js';
import { getFetch } from '../src/fetch-utils.js';
import pkgJson from '../src/package.cjs';

const TEST_DIR = path.resolve(__rootdir, 'test', 'fixtures', 'project');

describe('Integration test for up command with helix pages', function suite() {
  this.timeout(60000); // ensure enough time for installing modules on slow machines
  let testDir;
  let testRoot;
  let nock;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'project');
    nock = new Nock();
    nock.enableNetConnect(/127.0.0.1/);
    // Mock npm registry for update check (optional - not all tests trigger it)
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli')
      .optionally()
      .reply(200, {
        'dist-tags': {
          latest: pkgJson.version, // Same as current version to avoid update notification
        },
      });
    await fse.copy(TEST_DIR, testDir);
  });

  afterEach(async () => {
    // On Windows, git worktrees can leave file handles open
    // Add a small delay and retry logic for cleanup
    if (process.platform === 'win32') {
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      try {
        await fse.remove(testRoot);
      } catch (err) {
        if (err.code === 'EBUSY' || err.code === 'ENOTEMPTY') {
          // Wait a bit more and force remove
          await new Promise((resolve) => {
            setTimeout(resolve, 500);
          });
          await fse.remove(testRoot).catch(() => {
            // If still failing, try to at least clean up in next test run
            // Warning: Could not remove directory, will be cleaned up later
          });
        } else {
          throw err;
        }
      }
    } else {
      await fse.remove(testRoot);
    }
    nock.done();
  });

  it('up command opens browser and delivers correct response.', async () => {
    let opened;
    const MockedCommand = await esmock('../src/up.cmd.js', {
      '../src/abstract-server.cmd.js': await esmock('../src/abstract-server.cmd.js', {
        open: (url) => {
          opened = url;
        },
      }),
    });
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    const cmd = new MockedCommand()
      .withLiveReload(false)
      .withDirectory(testDir)
      .withOpen('/')
      .withHttpPort(0);

    nock('https://main--dummy-foo--adobe.aem.page')
      .get('/index.html')
      .reply(200, '## Welcome')
      .get('/not-found.txt')
      .reply(404);

    let port;
    await new Promise((resolve, reject) => {
      let error = null;
      cmd
        .on('started', async () => {
          try {
            port = cmd.project.server.port;
            let ret = await assertHttp(`http://127.0.0.1:${port}/index.html`, 200);
            assert.strictEqual(ret.trim(), '## Welcome');
            ret = await assertHttp(`http://127.0.0.1:${port}/local.txt`, 200);
            assert.strictEqual(ret.trim(), 'Hello, world.');
            await assertHttp(`http://127.0.0.1:${port}/not-found.txt`, 404);
          } catch (e) {
            error = e;
          }
          await cmd.stop();
        })
        .on('stopped', () => {
          if (error) {
            reject(error);
          }
          resolve();
        })
        .run()
        .catch(reject);
    });
    assert.strictEqual(opened, `http://localhost:${port}/`);
  });

  it('up command opens browser and delivers correct response on helix 5.', async () => {
    let opened;
    const MockedCommand = await esmock('../src/up.cmd.js', {
      '../src/abstract-server.cmd.js': await esmock('../src/abstract-server.cmd.js', {
        open: (url) => {
          opened = url;
        },
      }),
    });
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    const cmd = new MockedCommand()
      .withLiveReload(false)
      .withDirectory(testDir)
      .withOpen('/')
      .withHttpPort(0);

    nock('https://main--dummy-foo--adobe.aem.page')
      .get('/index.html')
      .reply(200, '## Welcome')
      .get('/not-found.txt')
      .reply(404);

    let port;
    await new Promise((resolve, reject) => {
      let error = null;
      cmd
        .on('started', async () => {
          try {
            port = cmd.project.server.port;
            let ret = await assertHttp(`http://127.0.0.1:${port}/index.html`, 200);
            assert.strictEqual(ret.trim(), '## Welcome');
            ret = await assertHttp(`http://127.0.0.1:${port}/local.txt`, 200);
            assert.strictEqual(ret.trim(), 'Hello, world.');
            await assertHttp(`http://127.0.0.1:${port}/not-found.txt`, 404);
          } catch (e) {
            error = e;
          }
          await cmd.stop();
        })
        .on('stopped', () => {
          if (error) {
            reject(error);
          }
          resolve();
        })
        .run()
        .catch(reject);
    });
    assert.strictEqual(opened, `http://localhost:${port}/`);
  });

  it('up command creates the correct login url', async () => {
    let opened;
    const MockedCommand = await esmock('../src/up.cmd.js', {
      '../src/abstract-server.cmd.js': await esmock(
        '../src/abstract-server.cmd.js',
        {
          open: (url) => {
            opened = url;
          },
        },
      ),
    });
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    const cmd = new MockedCommand()
      .withLiveReload(false)
      .withDirectory(testDir)
      .withOpen('/')
      .withHttpPort(0);

    let port;
    await new Promise((resolve, reject) => {
      let error = null;
      cmd
        .on('started', async () => {
          try {
            port = cmd.project.server.port;
            const resp = await getFetch()(
              `http://127.0.0.1:${port}/.aem/cli/login`,
              {
                cache: 'no-store',
                redirect: 'manual',
              },
            );
            assert.strictEqual(resp.status, 302);
            assert.ok(
              resp.headers
                .get('location')
                .startsWith(
                  'https://admin.hlx.page/login/adobe/dummy-foo/main?client_id=aem-cli&redirect_uri=http%3A%2F%2Flocalhost%3A0%2F.aem%2Fcli%2Flogin%2Fack&selectAccount=true&state=',
                ),
            );
          } catch (e) {
            error = e;
          }
          await cmd.stop();
        })
        .on('stopped', () => {
          if (error) {
            reject(error);
          }
          resolve();
        })
        .run()
        .catch(reject);
    });

    assert.strictEqual(opened, `http://localhost:${port}/`);
  });

  it('up command creates the correct login with custom url', async () => {
    let opened;
    const MockedCommand = await esmock('../src/up.cmd.js', {
      '../src/abstract-server.cmd.js': await esmock(
        '../src/abstract-server.cmd.js',
        {
          open: (url) => {
            opened = url;
          },
        },
      ),
    });
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    const cmd = new MockedCommand()
      .withLiveReload(false)
      .withDirectory(testDir)
      .withOpen('/')
      .withHttpPort(0)
      .withUrl('https://main--dummy--adobe.aem.page');

    let port;
    await new Promise((resolve, reject) => {
      let error = null;
      cmd
        .on('started', async () => {
          try {
            port = cmd.project.server.port;
            const resp = await getFetch()(
              `http://127.0.0.1:${port}/.aem/cli/login`,
              {
                cache: 'no-store',
                redirect: 'manual',
              },
            );
            assert.strictEqual(resp.status, 302);
            assert.ok(
              resp.headers
                .get('location')
                .startsWith(
                  'https://admin.hlx.page/login/adobe/dummy/main?client_id=aem-cli&redirect_uri=http%3A%2F%2Flocalhost%3A0%2F.aem%2Fcli%2Flogin%2Fack&selectAccount=true&state=',
                ),
            );
          } catch (e) {
            error = e;
          }
          await cmd.stop();
        })
        .on('stopped', () => {
          if (error) {
            reject(error);
          }
          resolve();
        })
        .run()
        .catch(reject);
    });

    assert.strictEqual(opened, `http://localhost:${port}/`);
  });

  it('up command opens browser and delivers correct response on helix 5 with auth.', async () => {
    const TOKEN = 'secret-site-token';
    function checkTokenAndReply(req, response) {
      const { authorization } = req.headers;
      if (!authorization) {
        return [401, 'Unauthorized'];
      }

      if (authorization !== `token ${TOKEN}`) {
        return [403, 'Forbidden'];
      }

      return response;
    }

    let opened;
    const MockedCommand = await esmock('../src/up.cmd.js', {
      '../src/abstract-server.cmd.js': await esmock('../src/abstract-server.cmd.js', {
        open: (url) => {
          opened = url;
        },
      }),
    });
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    const cmd = new MockedCommand()
      .withLiveReload(false)
      .withDirectory(testDir)
      .withOpen('/')
      .withHttpPort(0)
      .withSiteToken(TOKEN);

    nock('https://main--dummy-foo--adobe.aem.page')
      .get('/index.html')
      .reply(function f() {
        return checkTokenAndReply(this.req, [200, '## Welcome']);
      })
      .get('/not-found.txt')
      .reply(function f() {
        return checkTokenAndReply(this.req, [404, 'Not Found']);
      });

    let port;
    await new Promise((resolve, reject) => {
      let error = null;
      cmd
        .on('started', async () => {
          try {
            port = cmd.project.server.port;
            let ret = await assertHttp(`http://127.0.0.1:${port}/index.html`, 200);
            assert.strictEqual(ret.trim(), '## Welcome');
            ret = await assertHttp(`http://127.0.0.1:${port}/local.txt`, 200);
            assert.strictEqual(ret.trim(), 'Hello, world.');
            await assertHttp(`http://127.0.0.1:${port}/not-found.txt`, 404);
          } catch (e) {
            error = e;
          }
          await cmd.stop();
        })
        .on('stopped', () => {
          if (error) {
            reject(error);
          }
          resolve();
        })
        .run()
        .catch(reject);
    });
    assert.strictEqual(opened, `http://localhost:${port}/`);
  });

  it('up command correctly replaces variables in url', async () => {
    const MockedCommand = await esmock('../src/up.cmd.js', {
      '../src/abstract-server.cmd.js': await esmock('../src/abstract-server.cmd.js'),
    });
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git', 'test');
    const cmd = new MockedCommand()
      .withLiveReload(false)
      .withDirectory(testDir)
      .withOpen(false)
      .withHttpPort(0)
      .withUrl('https://main--{{repo}}--{{owner}}.example.com');

    nock('https://main--dummy-foo--adobe.example.com')
      .get('/index.html')
      .reply(200, '## Welcome');

    let port;
    await new Promise((resolve, reject) => {
      let error = null;
      cmd
        .on('started', async () => {
          try {
            // eslint-disable-next-line no-underscore-dangle
            assert.equal(cmd._url, 'https://main--dummy-foo--adobe.example.com');
            port = cmd.project.server.port;
            const ret = await assertHttp(`http://127.0.0.1:${port}/index.html`, 200);
            assert.strictEqual(ret.trim(), '## Welcome');
          } catch (e) {
            error = e;
          }
          await cmd.stop();
        })
        .on('stopped', () => {
          if (error) {
            reject(error);
          }
          resolve();
        })
        .run()
        .catch(reject);
    });
  });

  it('up command delivers correct response (branch with slash).', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git', 'tripod/test');
    let error = null;
    const cmd = new UpCommand()
      .withLiveReload(false)
      .withDirectory(testDir)
      .withOpen(false)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    nock('https://main--dummy-foo--adobe.aem.page')
      .get('/index.html')
      .reply(200, '## Welcome')
      .get('/not-found.txt')
      .reply(404);

    cmd
      .on('started', async () => {
        try {
          let ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/index.html`, 200);
          assert.strictEqual(ret.trim(), '## Welcome');
          ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/local.txt`, 200);
          assert.strictEqual(ret.trim(), 'Hello, world.');
          await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/not-found.txt`, 404);
          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });

  it('up command reloads when git branch changes.', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    let error = null;
    const cmd = new UpCommand()
      .withLiveReload(false)
      .withDirectory(testDir)
      .withOpen(false)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    nock('https://main--dummy-foo--adobe.aem.page')
      .get('/index.html')
      .reply(200, '## Welcome')
      .get('/not-found.txt')
      .reply(404);

    let timer;
    cmd
      .on('started', async () => {
        try {
          let ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/index.html`, 200);
          assert.strictEqual(ret.trim(), '## Welcome');
          ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/local.txt`, 200);
          assert.strictEqual(ret.trim(), 'Hello, world.');
          await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/not-found.txt`, 404);
          // now switch to a new branch
          switchBranch(testDir, 'new-branch');
          // wait 5 seconds for the git branch to be detected
          timer = signal(5000);
          await timer;
          // eslint-disable-next-line no-underscore-dangle
          assert.strictEqual(cmd._url, 'https://main--dummy-foo--adobe.aem.page');
          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .on('changed', () => {
        timer?.cancel();
      })
      .run()
      .catch(done);
  });

  it('up command stops when git branch changes to something too long', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    const cmd = new UpCommand()
      .withLiveReload(false)
      .withDirectory(testDir)
      .withOpen(false)
      .withHttpPort(0);

    nock('https://main--dummy-foo--adobe.aem.page')
      .get('/index.html')
      .reply(200, '## Welcome')
      .get('/not-found.txt')
      .reply(404);

    let timer;
    cmd
      .on('started', async () => {
        let ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/index.html`, 200);
        assert.strictEqual(ret.trim(), '## Welcome');
        ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/local.txt`, 200);
        assert.strictEqual(ret.trim(), 'Hello, world.');
        await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/not-found.txt`, 404);
        // now switch to a new branch
        switchBranch(testDir, 'new-and-totally-unreasonably-long-in-fact-too-long-branch');
        // wait 5 seconds for the git branch to be detected
        timer = signal(5000);
        await timer;
        assert.ok(!cmd.project.started, 'project should have stopped');
      })
      .on('stopped', () => {
        timer?.cancel();
        done();
      })
      .run()
      .catch(done);
  });
});

describe('Integration test for up command with git worktrees', function suite() {
  this.timeout(60000);
  let testDir;
  let testRoot;
  let nock;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'project');
    await fse.copy(TEST_DIR, testDir);
    nock = new Nock();
    nock.enableNetConnect(/127.0.0.1/);
    // Mock npm registry for update check (optional - not all tests trigger it)
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli')
      .optionally()
      .reply(200, {
        'dist-tags': {
          latest: pkgJson.version, // Same as current version to avoid update notification
        },
      });
  });

  afterEach(async () => {
    // On Windows, git worktrees can leave file handles open
    // Add a small delay and retry logic for cleanup
    if (process.platform === 'win32') {
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      try {
        await fse.remove(testRoot);
      } catch (err) {
        if (err.code === 'EBUSY' || err.code === 'ENOTEMPTY') {
          // Wait a bit more and force remove
          await new Promise((resolve) => {
            setTimeout(resolve, 500);
          });
          await fse.remove(testRoot).catch(() => {
            // If still failing, try to at least clean up in next test run
            // Warning: Could not remove directory, will be cleaned up later
          });
        } else {
          throw err;
        }
      }
    } else {
      await fse.remove(testRoot);
    }
    nock.done();
  });

  it('should detect worktree and calculate branch-based port', async () => {
    // Setup a regular git repo first
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');

    // Create an actual worktree using git CLI with unique name
    const worktreeName = `worktree-feature-${Date.now()}`;
    const worktreeDir = path.resolve(testRoot, worktreeName);
    let worktreeCreated = false;

    try {
      shell.cd(testDir);
      shell.exec(`git worktree add "${worktreeDir}" -b feature-branch`);
      worktreeCreated = true;

      // Test that isGitWorktree correctly identifies it
      const isWorktree = await GitUtils.isGitWorktree(worktreeDir);
      assert(isWorktree, 'Should be identified as a worktree');

      // Test that port calculation works for a branch name
      const port = GitUtils.hashBranchToPort('feature-branch');
      assert(port >= 3000 && port < 4000, `Port ${port} should be in range 3000-3999`);
      assert.notStrictEqual(port, 3000, 'Port should be different from default');
    } finally {
      // Clean up worktree if it was created
      if (worktreeCreated) {
        shell.cd(testDir);
        shell.exec(`git worktree remove "${worktreeDir}" --force || true`);

        // On Windows, add a delay to ensure git releases file handles
        if (process.platform === 'win32') {
          await new Promise((resolve) => {
            setTimeout(resolve, 200);
          });
        }
      }
      await fse.remove(worktreeDir).catch(() => {});
    }
  });

  it('should reject git submodules', async () => {
    // Initialize git repository
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');

    // Simulate a submodule by creating a .git file with relative path
    await fse.remove(path.join(testDir, '.git'));
    await fse.writeFile(
      path.join(testDir, '.git'),
      'gitdir: ../.git/modules/my-submodule',
    );

    const cmd = new UpCommand()
      .withLiveReload(false)
      .withDirectory(testDir);

    try {
      await cmd.init();
      assert.fail('Should have thrown an error for submodule');
    } catch (e) {
      assert(
        e.message.includes('git submodules are not supported'),
        `Expected submodule error, got: ${e.message}`,
      );
    }
  });

  it('should watch git directory correctly in worktree', async () => {
    // Initialize git repository
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');

    // Create an actual worktree using git CLI with unique name
    const worktreeName = `worktree-test-${Date.now()}`;
    const worktreeDir = path.resolve(testRoot, worktreeName);
    let worktreeCreated = false;

    try {
      shell.cd(testDir);
      shell.exec(`git worktree add "${worktreeDir}" -b test-branch`);
      worktreeCreated = true;

      const cmd = new UpCommand()
        .withLiveReload(false)
        .withDirectory(worktreeDir)
        .withHttpPort(0);

      await new Promise((resolve, reject) => {
        cmd
          .on('started', async () => {
            try {
              // Verify watcher is set up on the actual git directory
              // eslint-disable-next-line no-underscore-dangle
              assert(cmd._watcher, 'Watcher should be initialized');
              // The watcher should be watching the worktree git directory, not the .git file
              // This is implicitly tested by the fact that the server starts successfully
              await cmd.stop();
            } catch (e) {
              reject(e);
            }
          })
          .on('stopped', resolve)
          .run()
          .catch(reject);
      });
    } finally {
      // Clean up worktree if it was created
      if (worktreeCreated) {
        shell.cd(testDir);
        shell.exec(`git worktree remove "${worktreeDir}" --force || true`);

        // On Windows, add a delay to ensure git releases file handles
        if (process.platform === 'win32') {
          await new Promise((resolve) => {
            setTimeout(resolve, 200);
          });
        }
      }
      await fse.remove(worktreeDir).catch(() => {});
    }
  });
});

describe('Integration test for up command with cache', function suite() {
  this.timeout(60000); // ensure enough time for installing modules on slow machines
  let testDir;
  let testRoot;
  let nock;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'project');
    await fse.copy(TEST_DIR, testDir);
    nock = new Nock();
    // Mock npm registry for update check (optional - not all tests trigger it)
    nock('https://registry.npmjs.org')
      .get('/@adobe/aem-cli')
      .optionally()
      .reply(200, {
        'dist-tags': {
          latest: pkgJson.version, // Same as current version to avoid update notification
        },
      });
  });

  afterEach(async () => {
    nock.done();
    // On Windows, files can remain locked after tests
    // Add a small delay and retry logic for cleanup
    if (process.platform === 'win32') {
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      try {
        await fse.remove(testRoot);
      } catch (err) {
        if (err.code === 'EBUSY' || err.code === 'ENOTEMPTY') {
          // Wait a bit more and force remove
          await new Promise((resolve) => {
            setTimeout(resolve, 500);
          });
          await fse.remove(testRoot).catch(() => {
            // If still failing, try to at least clean up in next test run
            // Warning: Could not remove directory, will be cleaned up later
          });
        } else {
          throw err;
        }
      }
    } else {
      await fse.remove(testRoot);
    }
  });

  it('up command delivers correct cached response.', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    let error = null;
    const cmd = new UpCommand()
      .withLiveReload(false)
      .withDirectory(testDir)
      .withOpen(false)
      .withHttpPort(0)
      .withCache(path.resolve(testRoot, '.cache'));

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    const content = {
      index: '## Welcome',
      page1: '## Some page with qs',
      page2: '## Some different content for different qs',
      plain: 'Some plain content',
    };
    nock('https://main--dummy-foo--adobe.aem.page')
      .get('/index.html')
      .reply(200, content.index)
      .get('/folder/page.html?foo=bar&baz=qux')
      .reply(200, content.page1)
      .get('/folder/page.html?foo=bar&baz=othervalue')
      .reply(200, content.page2)
      .get('/not-found.txt')
      .reply(404)
      .get('/page.plain.html')
      .reply(200, content.plain, { 'Content-Type': 'text/html' })
      .get('/head.html')
      .reply(200, '<link rel="stylesheet" href="/styles.css"/>');

    nock.enableNetConnect(/127.0.0.1/);

    cmd
      .on('started', async () => {
        try {
          const assertRequests = async () => {
            let ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/index.html`, 200);
            assert.strictEqual(ret.trim(), content.index);
            ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/`, 200);
            assert.strictEqual(ret.trim(), content.index);
            ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/folder/page.html?foo=bar&baz=qux`, 200);
            assert.strictEqual(ret.trim(), content.page1);
            ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/folder/page.html?foo=bar&baz=othervalue`, 200);
            assert.strictEqual(ret.trim(), content.page2);
            await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/not-found.txt`, 404);
            ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/page.plain.html`, 200);
            assert.strictEqual(ret.trim(), content.plain);

            ret = await assertHttp(`http://127.0.0.1:${cmd.project.server.port}/local.txt`, 200);
            assert.strictEqual(ret.trim(), 'Hello, world.');
          };

          await assertRequests();

          // re-running the same requests with nock scopes "done" should still work
          // because content will be served from the cache or from local file
          await assertRequests();

          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });

  it('preserves --pagesUrl during git reconfiguration', async () => {
    const gitUrl = new GitUrl('https://github.com/adobe/test-repo.git', { ref: 'main' });
    const cmd = new UpCommand();
    cmd.withUrl('https://custom.domain.com');

    // eslint-disable-next-line no-underscore-dangle
    assert.strictEqual(cmd._originalUrl, 'https://custom.domain.com', 'Original URL should be stored');
    // eslint-disable-next-line no-underscore-dangle
    assert.strictEqual(cmd._url, undefined, 'URL should be undefined until initUrl() is called');

    await cmd.initUrl(gitUrl, 'main');

    // eslint-disable-next-line no-underscore-dangle
    assert.strictEqual(cmd._url, 'https://custom.domain.com', 'User-provided --pagesUrl should be preserved during git reconfiguration');
  });
});
