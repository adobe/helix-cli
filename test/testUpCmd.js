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
/* eslint-disable no-unused-expressions */
const assert = require('assert');
const path = require('path');
const fse = require('fs-extra');
const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const FSPersister = require('@pollyjs/persister-fs');
const { setupMocha: setupPolly } = require('@pollyjs/core');

const {
  initGit,
  assertHttp,
  assertHttpDom,
  assertFile,
  createTestRoot,
} = require('./utils.js');

const UpCommand = require('../src/up.cmd');

const TEST_DIR = path.resolve('test/integration');

describe('Integration test for up command', function suite() {
  this.timeout(20000);
  let testDir;
  let buildDir;
  let testRoot;

  setupPolly({
    recordFailedRequests: true,
    recordIfMissing: false,
    logging: false,
    adapters: [NodeHttpAdapter],
    persister: FSPersister,
    persisterOptions: {
      fs: {
        recordingsDir: path.resolve(__dirname, 'fixtures/recordings'),
      },
    },
  });

  beforeEach(async function before() {
    this.polly.server.any()
      .filter((req) => req.headers.host.startsWith('localhost') || req.headers.host.startsWith('127.0.0.1'))
      .passthrough();

    testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'project');
    buildDir = path.resolve(testRoot, '.hlx/build');
    await fse.copy(TEST_DIR, testDir);
  });

  afterEach(async () => {
    await fse.remove(testRoot);
  });

  it('up command fails outside git repository', async () => {
    try {
      await new UpCommand()
        .withFiles([path.join(testDir, 'src', '*.htl'), path.join(testDir, 'src', '*.js')])
        .withTargetDir(buildDir)
        .withDirectory(testDir)
        .run();
      assert.fail('hlx up without .git should fail.');
    } catch (e) {
      assert.equal(e.message, 'hlx up needs local git repository.');
    }
  });

  it('up command with local repo without configured origin succeeds and can be stopped', (done) => {
    initGit(testDir);
    new UpCommand()
      .withFiles([path.join(testDir, 'src', '*.htl'), path.join(testDir, 'src', '*.js')])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withLocalRepo(['.']) // default
      .withHttpPort(0)
      .on('started', (cmd) => {
        cmd.stop();
      })
      .on('stopped', () => {
        done();
      })
      .run()
      .catch(done);
  });

  it('up command succeeds and can be stopped', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    new UpCommand()
      .withFiles([path.join(testDir, 'src', '*.htl'), path.join(testDir, 'src', '*.js')])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withHttpPort(0)
      .on('started', (cmd) => {
        // eslint-disable-next-line no-console
        console.log(`test server running on port ${cmd.project.server.port}`);
        cmd.stop();
      })
      .on('stopped', () => {
        done();
      })
      .run()
      .catch(done);
  });

  it('up command delivers correct response.', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    let error = null;
    const cmd = new UpCommand()
      .withFiles([
        path.join(testDir, 'src', '*.htl'),
        path.join(testDir, 'src', '*.js'),
        path.join(testDir, 'src', 'utils', '*.js'),
      ])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    cmd
      .on('started', async () => {
        try {
          await assertHttpDom(`http://localhost:${cmd.project.server.port}/index.html`, 200, 'simple_response.html');
          await assertHttp(`http://localhost:${cmd.project.server.port}/welcome.txt`, 200, 'welcome_response.txt');
          return myDone();
        } catch (e) {
          return myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });

  it('up command delivers correct response with different host.', async () => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    await fse.rename(path.resolve(testDir, 'default-config.yaml'), path.resolve(testDir, 'helix-config.yaml'));
    const cmd = new UpCommand()
      .withFiles([
        path.join(testDir, 'src', '*.htl'),
        path.join(testDir, 'src', '*.js'),
        path.join(testDir, 'src', 'utils', '*.js'),
      ])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withOverrideHost('www.project-helix.io')
      .withHttpPort(0);

    await new Promise((resolve) => {
      cmd.on('started', resolve);
      cmd.run();
    });

    try {
      await assertHttpDom(`http://localhost:${cmd.project.server.port}/README.html`, 200, 'simple_response_readme.html');
    } finally {
      await cmd.stop();
    }
  });

  it('up command delivers correct response for JSX templates.', async () => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    await fse.rename(path.resolve(testDir, 'default-config.yaml'), path.resolve(testDir, 'helix-config.yaml'));
    const cmd = new UpCommand()
      .withFiles([
        path.join(testDir, 'src', '*.htl'),
        path.join(testDir, 'src', '*.js'),
        path.join(testDir, 'src', '*.jsx'),
        path.join(testDir, 'src', 'utils', '*.js'),
      ])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withOverrideHost('www.project-helix.io')
      .withHttpPort(0);

    await new Promise((resolve) => {
      cmd.on('started', resolve);
      cmd.run();
    });

    try {
      await assertHttpDom(`http://localhost:${cmd.project.server.port}/README.footer.html`, 200, 'footer_response_readme.html');
    } finally {
      await cmd.stop();
    }
  });

  it('up command delivers correct response from secondary local repository.', async () => {
    const apiDir = path.resolve(testRoot, 'api-repo');
    await fse.copy(path.resolve(__dirname, 'fixtures', 'api-repo'), apiDir);
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    initGit(apiDir, 'https://github.com/adobe/project-helix-api.git');
    await fse.rename(path.resolve(testDir, 'default-config.yaml'), path.resolve(testDir, 'helix-config.yaml'));
    const cmd = new UpCommand()
      .withFiles([
        path.join(testDir, 'src', '*.htl'),
        path.join(testDir, 'src', '*.js'),
        path.join(testDir, 'src', 'utils', '*.js'),
      ])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withOverrideHost('www.project-helix.io')
      .withLocalRepo(apiDir)
      .withHttpPort(0);

    await new Promise((resolve) => {
      cmd.on('started', resolve);
      cmd.run();
    });

    try {
      await assertHttpDom(`http://localhost:${cmd.project.server.port}/README.html`, 200, 'simple_response_readme.html');
      await assertHttpDom(`http://localhost:${cmd.project.server.port}/api/README.html`, 200, 'api_response_readme.html');
    } finally {
      await cmd.stop();
    }
  });

  it.skip('up command delivers correct response with proxy as default.', async () => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    const cfg = path.resolve(testDir, 'helix-config.yaml');
    await fse.copy(path.resolve(__dirname, 'fixtures', 'default-proxy.yaml'), cfg);
    const cmd = new UpCommand()
      .withFiles([path.join(testDir, 'src', '*.htl'), path.join(testDir, 'src', '*.js')])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withOverrideHost('www.no-exist.com')
      .withHttpPort(0);

    await new Promise((resolve) => {
      cmd.on('started', resolve);
      cmd.run();
    });

    try {
      await assertHttpDom(`http://localhost:${cmd.project.server.port}/README.html`, 200, 'simple_response_readme.html');
    } finally {
      await cmd.stop();
    }
  });

  it('up command writes default config.', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    assertFile(path.resolve(testDir, 'helix-config.yaml'), true);
    let error = null;
    const cmd = new UpCommand()
      .withFiles([path.join(testDir, 'src', '*.htl'), path.join(testDir, 'src', '*.js')])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withSaveConfig(true)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    cmd
      .on('started', async () => {
        try {
          assertFile(path.resolve(testDir, 'helix-config.yaml'));
          myDone();
        } catch (e) {
          myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .run()
      .catch(done);
  });

  it('up command handles modified sources and delivers correct response.', (done) => {
    // this test always hangs on the CI, probably due to the parcel workers. ignoring for now.
    const srcFile = path.resolve(testDir, 'src/html2.htl');
    const dstFile = path.resolve(testDir, 'src/html.htl');

    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    let error = null;
    const cmd = new UpCommand()
      .withFiles([
        path.join(testDir, 'src', '*.htl'),
        path.join(testDir, 'src', '*.js'),
        path.join(testDir, 'src', 'utils', '*.js'),
      ])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withHttpPort(0);

    const myDone = async (err) => {
      error = err;
      return cmd.stop();
    };

    cmd
      .on('started', async () => {
        try {
          await assertHttpDom(`http://localhost:${cmd.project.server.port}/index.html`, 200, 'simple_response.html');
          // ignore for now, as we don't know how to exactly setup the 404 handler.
          // await assertHttpDom(`http://localhost:${cmd.project.server.port}/404.html`, 404, '404_response.html');
          await assertHttp(`http://localhost:${cmd.project.server.port}/welcome.txt`, 200, 'welcome_response.txt');
          await assertHttp(`http://localhost:${cmd.project.server.port}/index.json`, 200, 'json_response.json');
          await fse.copy(srcFile, dstFile);
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .on('build', async () => {
        try {
          await assertHttpDom(`http://localhost:${cmd.project.server.port}/index.html`, 200, 'simple_response2.html');
          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .run()
      .catch(done);
  });

  it('up command handles modified includes and delivers correct response.', (done) => {
    // this test always hangs on the CI, probably due to the parcel workers. ignoring for now.
    const srcFile = path.resolve(testDir, 'src/third_helper.js');
    const dstFile = path.resolve(testDir, 'src/helper.js');

    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    let error = null;
    const cmd = new UpCommand()
      .withFiles([
        path.join(testDir, 'src', '*.htl'),
        path.join(testDir, 'src', '*.js'),
      ])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withHttpPort(0);

    const myDone = async (err) => {
      error = err;
      return cmd.stop();
    };

    cmd
      .on('started', async () => {
        try {
          await assertHttpDom(`http://localhost:${cmd.project.server.port}/index.dump.html`, 200, 'dump_response.html');
          await fse.copy(srcFile, dstFile);
        } catch (e) {
          await myDone(e);
        }
      })
      .on('stopped', () => {
        done(error);
      })
      .on('build', async () => {
        try {
          await assertHttpDom(`http://localhost:${cmd.project.server.port}/index.dump.html`, 200, 'dump_response2.html');
          await myDone();
        } catch (e) {
          await myDone(e);
        }
      })
      .run()
      .catch(done);
  });
});
