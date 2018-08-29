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

/* global describe, before, after, it */
/* eslint-disable no-underscore-dangle */

const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const shell = require('shelljs'); // eslint-disable-line import/no-extraneous-dependencies
const HelixProject = require('../src/HelixProject.js');

if (!shell.which('git')) {
  shell.echo('Sorry, this tests requires git');
  shell.exit(1);
}

// throw a Javascript error when any shell.js command encounters an error
shell.config.fatal = true;

const SPEC_ROOT = path.resolve(__dirname, 'specs');

const SPECS_WITH_GIT = [
  path.join(SPEC_ROOT, 'local'),
];

const SPECS_WITH_FAKE_GIT = [
  path.join(SPEC_ROOT, 'invalid_no_src'),
  path.join(SPEC_ROOT, 'invalid_no_content'),
  path.join(SPEC_ROOT, 'local'),
  path.join(SPEC_ROOT, 'remote'),
  path.join(SPEC_ROOT, 'emptycfg'),
];

function initRepository(dir) {
  const pwd = shell.pwd();
  shell.cd(dir);
  shell.exec('git init');
  shell.exec('git add -A');
  shell.exec('git commit -m"initial commit."');
  shell.cd(pwd);
}

function initFakeRepository(dir) {
  fs.ensureDirSync(path.resolve(dir, '.git'));
}

function removeRepository(dir) {
  shell.rm('-rf', path.resolve(dir, '.git'));
}

describe('Helix Project', () => {
  before(() => {
    // create git repos
    SPECS_WITH_GIT.forEach(initRepository);
    // create fake git repos
    SPECS_WITH_FAKE_GIT.forEach(initFakeRepository);
  });

  after(() => {
    // create fake git repos
    SPECS_WITH_GIT.forEach(removeRepository);
  });

  it('throws error with no repository', (done) => {
    new HelixProject()
      .withCwd(path.join(SPEC_ROOT, 'invalid_no_git'))
      .init()
      .then(() => {
        done('expected error');
      })
      .catch((e) => {
        assert.equal(e.toString(), 'Error: Local README.md or index.md must be inside a valid git repository.');
        done();
      })
      .catch(done);
  });

  it('throws error with no src directory', (done) => {
    new HelixProject()
      .withCwd(path.join(SPEC_ROOT, 'invalid_no_src'))
      .init()
      .then(() => {
        done('expected error');
      })
      .catch((e) => {
        assert.equal(e.toString(), 'Error: Invalid config. No "code" location specified and no "src" directory.');
        done();
      })
      .catch(done);
  });

  it('throws error with no README.md', (done) => {
    new HelixProject()
      .withCwd(path.join(SPEC_ROOT, 'invalid_no_content'))
      .init()
      .then(() => {
        done('expected error');
      })
      .catch((e) => {
        assert.equal(e.toString(), 'Error: Invalid config. No "content" location specified and no "README.md" or "index.md" found.');
        done();
      })
      .catch(done);
  });

  it('detects local src and readme', (done) => {
    const cwd = path.join(SPEC_ROOT, 'local');

    const GIT_CONFIG = {
      configPath: '<internal>',
      listen: {
        http: {
          port: 0,
          host: '0.0.0.0',
        },
      },
      logs: {
        level: 'info',
        logsDir: './logs',
        reqLogFormat: 'short',
      },
      repoRoot: '.',
      subdomainMapping: {
        baseDomains: [
          'localtest.me',
          'lvh.me',
          'vcap.me',
          'lacolhost.com',
        ],
        enable: true,
      },
      virtualRepos: {
        helix: {
          content: {
            path: cwd,
          },
        },
      },
    };

    new HelixProject()
      .withCwd(cwd)
      .init()
      .then((cfg) => {
        assert.equal(cfg.contentRepo, undefined);
        assert.equal(cfg._needLocalServer, true);
        assert.deepEqual(cfg.gitConfig, GIT_CONFIG);
        done();
      })
      .catch(done);
  });

  it('local code and content with empty config', (done) => {
    const cwd = path.join(SPEC_ROOT, 'emptycfg');
    new HelixProject()
      .withCwd(cwd)
      .init()
      .then((cfg) => {
        assert.equal(cfg.contentRepo, undefined);
        assert.equal(cfg._needLocalServer, true);
        done();
      })
      .catch(done);
  });

  it('remote code and content', (done) => {
    const cwd = path.join(SPEC_ROOT, 'remote');
    new HelixProject()
      .withCwd(cwd)
      .init()
      .then((cfg) => {
        assert.equal(cfg.contentRepo.raw, 'https://raw.github.com/Adobe-Marketing-Cloud/reactor-user-docs/master');
        assert.equal(cfg._needLocalServer, false);
        done();
      })
      .catch(done);
  });

  it('can set relative build dir', (done) => {
    const cwd = path.join(SPEC_ROOT, 'remote');
    new HelixProject()
      .withCwd(cwd)
      .withBuildDir('tmp/mybuild')
      .init()
      .then((cfg) => {
        assert.equal(cfg.buildDir, path.resolve(cwd, 'tmp/mybuild'));
        done();
      })
      .catch(done);
  });

  it('can set absolute build dir', (done) => {
    const cwd = path.join(SPEC_ROOT, 'remote');
    new HelixProject()
      .withCwd(cwd)
      .withBuildDir('/tmp/helix-build')
      .init()
      .then((cfg) => {
        assert.equal(cfg.buildDir, path.resolve('/tmp/helix-build'));
        done();
      })
      .catch(done);
  });

  it('can set port', (done) => {
    const cwd = path.join(SPEC_ROOT, 'remote');
    new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0)
      .init()
      .then(cfg => cfg.start())
      .then((cfg) => {
        assert.equal(true, cfg.started);
        assert.notEqual(cfg.server.port, 0);
        assert.notEqual(cfg.server.port, 3000);
        return cfg.stop();
      })
      .then((cfg) => {
        assert.equal(false, cfg.started);
        done();
      })
      .catch(done);
  });

  it('can start and stop local project', (done) => {
    const cwd = path.join(SPEC_ROOT, 'local');
    const project = new HelixProject()
      .withCwd(cwd)
      .withHttpPort(0);
    project
      .init()
      .then(cfg => cfg.start())
      .then((cfg) => {
        assert.equal(true, cfg.started);
        assert.ok(/http:\/\/127.0.0.1:\d+\/raw\/helix\/content\/master/.test(cfg.contentRepo.raw));
        return cfg.stop();
      })
      .then((cfg) => {
        assert.equal(false, cfg.started);
        done();
      })
      .catch((err) => {
        project.stop().then(() => {
          done(err);
        });
      })
      .catch(done);
  });
});
