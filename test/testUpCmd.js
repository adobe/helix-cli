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
const $ = require('shelljs');
const { logging } = require('@adobe/helix-testutils');
const { decodeFileParams } = require('../src/yargs-params');

const {
  initGit,
  assertHttp,
  assertHttpDom,
  assertFile,
  createTestRoot,
  getTestModules,
  setupPolly,
} = require('./utils.js');

const UpCommand = require('../src/up.cmd');

const TEST_DIR = path.resolve('test/integration');

describe('Integration test for up command', function suite() {
  this.timeout(60000); // ensure enough time for installing modules on slow machines
  let testDir;
  let buildDir;
  let testRoot;
  let testModules;
  let pollyError;

  setupPolly({
    recordIfMissing: false,
  });

  before(async () => {
    testModules = [await getTestModules(), ...module.paths];
  });

  beforeEach(async function beforeEach() {
    process.env.HELIX_PIPELINE_FORCE_HTTP1 = true;
    this.polly.server.any()
      .filter((req) => req.headers.host.startsWith('localhost') || req.headers.host.startsWith('127.0.0.1'))
      .passthrough();
    this.polly.server.any().on('error', () => {
      pollyError = Error('Polly error');
    });

    pollyError = null;
    testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'project');
    buildDir = path.resolve(testRoot, '.hlx/build');
    await fse.copy(TEST_DIR, testDir);
  });

  afterEach(async () => {
    delete process.env.HELIX_PIPELINE_FORCE_HTTP1;
    await fse.remove(testRoot);
  });

  it('up command fails outside git repository', async () => {
    try {
      await new UpCommand()
        .withFiles([path.join(testDir, 'src', '*.htl'), path.join(testDir, 'src', '*.js')])
        .withTargetDir(buildDir)
        .withModulePaths(testModules)
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
      .withModulePaths(testModules)
      .withDirectory(testDir)
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
      .withModulePaths(testModules)
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
      .withLiveReload(false)
      .withFiles([
        path.join(testDir, 'src', '*.htl'),
        path.join(testDir, 'src', '*.js'),
        path.join(testDir, 'src', 'utils', '*.js'),
      ])
      .withTargetDir(buildDir)
      .withModulePaths(testModules)
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
        done(error || pollyError);
      })
      .run()
      .catch(done);
  });

  it('up command delivers correct response with live-reload.', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    let error = null;
    const cmd = new UpCommand()
      .withLiveReload(true)
      .withFiles([
        path.join(testDir, 'src', '*.htl'),
        path.join(testDir, 'src', '*.js'),
        path.join(testDir, 'src', 'utils', '*.js'),
      ])
      .withTargetDir(buildDir)
      .withModulePaths(testModules)
      .withDirectory(testDir)
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    cmd
      .on('started', async () => {
        try {
          await assertHttpDom(`http://localhost:${cmd.project.server.port}/index.html`, 200, 'simple_response_with_livereload.html');
          return myDone();
        } catch (e) {
          return myDone(e);
        }
      })
      .on('stopped', () => {
        done(error || pollyError);
      })
      .run()
      .catch(done);
  });

  it('up command can provide dev-defaults.', (done) => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    let error = null;
    const cmd = new UpCommand()
      .withFiles([
        path.join(testDir, 'src', '*.htl'),
        path.join(testDir, 'src', '*.js'),
        path.join(testDir, 'src', 'utils', '*.js'),
      ])
      .withTargetDir(buildDir)
      .withModulePaths(testModules)
      .withDirectory(testDir)
      .withDevDefault({ MY_DEFAULT_0: 'default-0' })
      .withDevDefaultFile(decodeFileParams.bind(null, ['defaults.json', 'defaults.env']))
      .withHttpPort(0);

    const myDone = (err) => {
      error = err;
      return cmd.stop();
    };

    cmd
      .on('started', async () => {
        try {
          assert.deepEqual(cmd.project.actionParams, {
            MY_DEFAULT_0: 'default-0',
            MY_DEFAULT_1: 'default-value-1',
            MY_DEFAULT_2: 'default-value-2',
          });
          return myDone();
        } catch (e) {
          return myDone(e);
        }
      })
      .on('stopped', () => {
        done(error || pollyError);
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
      .withModulePaths(testModules)
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

  it('up command delivers correct response from private repo.', async function test() {
    // override poly recorder to send readme.md for authenticated requests.
    const readmeMd = await fse.readFile(path.resolve(TEST_DIR, 'README.md'), 'utf-8');
    const { server } = this.polly;
    const privateHandler = () => {
      server.get('/adobe/project-helix/master/README.md').intercept((req, res) => {
        if (req.headers.authorization === 'Bearer 1234' || req.headers.authorization === 'token 1234') {
          res.sendStatus(200).send(readmeMd);
        } else {
          res.sendStatus(401);
        }
      });
    };
    server.host('https://raw.githubusercontent.com', privateHandler);

    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    await fse.rename(path.resolve(testDir, 'default-config-private.yaml'), path.resolve(testDir, 'helix-config.yaml'));
    const cmd = new UpCommand()
      .withFiles([
        path.join(testDir, 'src', '*.htl'),
        path.join(testDir, 'src', '*.js'),
        path.join(testDir, 'src', 'utils', '*.js'),
      ])
      .withTargetDir(buildDir)
      .withModulePaths(testModules)
      .withDirectory(testDir)
      .withGithubToken('1234')
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
      .withModulePaths(testModules)
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
      .withModulePaths(testModules)
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

  it('up command fails if secondary local repository is not valid.', async () => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    const localRepo = path.resolve(testDir, 'foo');
    const cmd = new UpCommand()
      .withFiles([
        path.join(testDir, 'src', '*.htl'),
        path.join(testDir, 'src', '*.js'),
        path.join(testDir, 'src', 'utils', '*.js'),
      ])
      .withTargetDir(buildDir)
      .withModulePaths(testModules)
      .withDirectory(testDir)
      .withLocalRepo(localRepo);
    try {
      await cmd.run();
      assert.fail('hlx up without .git should fail.');
    } catch (e) {
      const expected = `Specified --local-repo=${localRepo} is not a git repository.`;
      assert.equal(e.message, expected);
    }
  });

  it('up command shows warning if secondary local repository is not valid.', async () => {
    const apiDir = path.resolve(testRoot, 'api-repo');
    await fse.copy(path.resolve(__dirname, 'fixtures', 'api-repo'), apiDir);
    initGit(apiDir);
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    const logger = logging.createTestLogger();
    const cmd = new UpCommand(logger)
      .withFiles([
        path.join(testDir, 'src', '*.htl'),
        path.join(testDir, 'src', '*.js'),
        path.join(testDir, 'src', 'utils', '*.js'),
      ])
      .withTargetDir(buildDir)
      .withModulePaths(testModules)
      .withDirectory(testDir)
      .withLocalRepo(apiDir);
    try {
      await cmd.run();
    } catch (e) {
      // ignore
    } finally {
      await cmd.stop();
    }
    const log = logger.getOutput();
    assert.ok(log.indexOf(`Ignoring --local-repo=${apiDir}. No remote 'origin' defined.`) >= 0);
  });

  it.skip('up command delivers correct response with proxy as default.', async () => {
    initGit(testDir, 'https://github.com/adobe/dummy-foo.git');
    const cfg = path.resolve(testDir, 'helix-config.yaml');
    await fse.copy(path.resolve(__dirname, 'fixtures', 'default-proxy.yaml'), cfg);
    const cmd = new UpCommand()
      .withFiles([path.join(testDir, 'src', '*.htl'), path.join(testDir, 'src', '*.js')])
      .withTargetDir(buildDir)
      .withModulePaths(testModules)
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
      .withModulePaths(testModules)
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
      .withLiveReload(false)
      .withFiles([
        path.join(testDir, 'src', '*.htl'),
        path.join(testDir, 'src', '*.js'),
        path.join(testDir, 'src', 'utils', '*.js'),
      ])
      .withTargetDir(buildDir)
      .withModulePaths(testModules)
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
      .withModulePaths(testModules)
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

describe('Integration test for up command (custom pipeline)', function suite() {
  this.timeout(60000); // ensure enough time for installing modules on slow machines

  let testDir;
  let buildDir;
  let testRoot;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    testDir = path.resolve(testRoot, 'project');
    buildDir = path.resolve(testDir, '.hlx', 'build');
    await fse.copy(TEST_DIR, testDir);
  });

  afterEach(async () => {
    await fse.remove(testRoot);
  });

  it('up command installs a default pipeline', (done) => {
    initGit(testDir);
    new UpCommand()
      .withFiles([path.join(testDir, 'src', '*.htl'), path.join(testDir, 'src', '*.js')])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withHttpPort(0)
      .withCustomPipeline('@adobe/helix-pipeline@1.0.0')
      .on('started', async (cmd) => {
        const pipelinePackageJson = path.resolve(buildDir, 'node_modules', '@adobe/helix-pipeline', 'package.json');
        assertFile(pipelinePackageJson);
        cmd.stop();
      })
      .on('stopped', () => {
        done();
      })
      .run()
      .catch(done);
  });

  it('up command installs the correct custom pipeline', (done) => {
    initGit(testDir);
    new UpCommand()
      .withFiles([path.join(testDir, 'src', '*.htl'), path.join(testDir, 'src', '*.js')])
      .withTargetDir(buildDir)
      .withDirectory(testDir)
      .withHttpPort(0)
      .withCustomPipeline('@adobe/helix-pipeline@1.0.0')
      .on('started', async (cmd) => {
        const pipelinePackageJson = path.resolve(buildDir, 'node_modules', '@adobe/helix-pipeline', 'package.json');
        assertFile(pipelinePackageJson);
        const pkg = await fse.readJson(pipelinePackageJson);
        assert.equal(pkg.version, '1.0.0');
        cmd.stop();
      })
      .on('stopped', () => {
        done();
      })
      .run()
      .catch(done);
  });

  it('up command uses the correct custom pipeline with directory', async () => {
    // checkout clone of helix-pipeline
    const pipelineDir = path.resolve(testRoot, 'my-pipeline');
    $.exec(`git clone --branch master --quiet --depth 1 https://github.com/adobe/helix-pipeline.git ${pipelineDir}`);

    // add some marker to the package.json
    const pkgJson = await fse.readJson(path.resolve(pipelineDir, 'package.json'));
    const version = `${pkgJson.version}-test`;
    pkgJson.version = version;
    await fse.writeJson(path.resolve(pipelineDir, 'package.json'), pkgJson);

    initGit(testDir);
    await new Promise((resolve, reject) => {
      new UpCommand()
        .withFiles([path.join(testDir, 'src', '*.htl'), path.join(testDir, 'src', '*.js')])
        .withTargetDir(buildDir)
        .withDirectory(testDir)
        .withHttpPort(0)
        .withCustomPipeline('../my-pipeline')
        .on('started', async (cmd) => {
          try {
            const pipelinePackageJson = path.resolve(buildDir, 'node_modules', '@adobe', 'helix-pipeline', 'package.json');
            assertFile(pipelinePackageJson);
            const pkg = await fse.readJson(pipelinePackageJson);
            assert.equal(pkg.version, version);
          } catch (e) {
            reject(e);
          }
          cmd.stop();
        })
        .on('stopped', () => {
          resolve();
        })
        .run()
        .catch(reject);
    });
  });
});
