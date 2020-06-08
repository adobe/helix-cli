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

const assert = require('assert');
const fs = require('fs-extra');
const $ = require('shelljs');
const path = require('path');
const { logging } = require('@adobe/helix-testutils');
const {
  createTestRoot, assertFile, assertZipEntries, getTestModules,
} = require('./utils.js');
const PackageCommand = require('../src/package.cmd.js');

describe('hlx package (Integration)', () => {
  let testRoot;
  let hlxDir;
  let buildDir;
  let testModules;

  before(async function beforeAll() {
    this.timeout(60000); // ensure enough time for installing modules on slow machines
    testModules = [await getTestModules(), ...module.paths];
  });

  beforeEach(async () => {
    testRoot = await createTestRoot();
    hlxDir = path.resolve(testRoot, '.hlx');
    buildDir = path.resolve(hlxDir, 'build');
    await fs.copy(path.resolve(__dirname, 'integration'), testRoot);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
  });

  it('package creates correct package', async () => {
    const created = {};
    const ignored = {};
    await new PackageCommand()
      .withModulePaths(testModules)
      .withDirectory(testRoot)
      .withTarget(buildDir)
      .withFiles([
        'src/html.htl',
        'src/html.pre.js',
        'src/helper.js',
        'src/utils/another_helper.js',
        'src/third_helper.js',
      ])
      .withOnlyModified(false)
      .withMinify(false)
      .on('create-package', (info) => {
        created[info.name] = true;
      })
      .on('ignore-package', (info) => {
        ignored[info.name] = true;
      })
      .run();

    // verify build output
    assertFile(path.resolve(buildDir, 'src', 'html.js'));
    assertFile(path.resolve(buildDir, 'src', 'html.script.js'));
    assertFile(path.resolve(buildDir, 'src', 'html.script.js.map'));
    assertFile(path.resolve(buildDir, 'src', 'html.info.json'));
    assertFile(path.resolve(buildDir, 'src', 'html.bundle.js'));
    assertFile(path.resolve(buildDir, 'src', 'html.zip'));

    assert.deepEqual(created, {
      html: true,
    }, 'created packages');
    assert.deepEqual(ignored, {}, 'ignored packages');

    await assertZipEntries(
      path.resolve(buildDir, 'src', 'html.zip'),
      ['package.json', 'html.js'],
    );

    // execute html script
    {
      const bundle = path.resolve(buildDir, 'src', 'html.bundle.js');
      // eslint-disable-next-line global-require,import/no-dynamic-require
      const { main } = require(bundle);
      const ret = await main({
        path: '/README.md',
        content: {
          body: '# foo',
        },
      });
      delete ret.headers['Server-Timing'];
      delete ret.headers['Cache-Control'];
      assert.deepEqual(ret, {
        body: "<!DOCTYPE html><html>\n\t<head>\n\t\t<title>Example</title>\n\t\t<link rel=\"related\" href=\"/welcome.txt\">\n\t</head>\n\t<body>\n\t\tNothing happens here, yet.\n\n\t\t<h1>Here are a few things I know:</h1>\n\t\t<dl>\n\t\t\t<dt>Requested Content</dt>\n\t\t\t<dd><code>/README.md</code></dd>\n\n\t\t\t<dt>Title</dt>\n\t\t\t<dd><code>foo</code></dd>\n\t\t</dl>\n\t\t<!-- anyway, here's the full content-->\n\t\t<main>\n\t\t<h1 id=\"foo\">foo</h1>\n\t\t</main>\n\t</body>\n</html>",
        headers: {
          'Content-Type': 'text/html',
          Link: '</welcome.txt>; rel="related"',
        },
        statusCode: 200,
      });
      delete require.cache[require.resolve(bundle)];
    }
  }).timeout(60000);

  // todo: fix
  it.skip('package reports bundling errors and warnings', async () => {
    const logger = logging.createTestLogger();
    await new PackageCommand(logger)
      .withDirectory(testRoot)
      .withTarget(buildDir)
      .withFiles([
        'src/broken_html.pre.js',
      ])
      .withOnlyModified(true)
      .withMinify(false)
      .run();

    const log = logger.getOutput();
    assert.ok(/Module not found: Error: Can't resolve 'does-not-exist'/.test(log));
    assert.ok(/Critical dependency: the request of a dependency is an expression/.test(log));
  }).timeout(60000);
});

describe('hlx package (custom pipeline)', function suite() {
  this.timeout(60000);

  let testRoot;
  let hlxDir;
  let buildDir;
  let projectDir;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    projectDir = path.resolve(testRoot, 'project');
    hlxDir = path.resolve(projectDir, '.hlx');
    buildDir = path.resolve(hlxDir, 'build');
    await fs.copy(path.resolve(__dirname, 'integration'), projectDir);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
  });

  it('package installs a default pipeline', async () => {
    await new PackageCommand()
      .withDirectory(projectDir)
      .withTarget(buildDir)
      .withFiles([
        'src/html.htl',
        'src/html.pre.js',
      ])
      .withOnlyModified(false)
      .withMinify(false)
      .run();

    // verify build output
    assertFile(path.resolve(buildDir, 'src', 'html.js'));
    const pipelinePackageJson = path.resolve(buildDir, 'node_modules', '@adobe/helix-pipeline', 'package.json');
    assertFile(pipelinePackageJson);
  });

  it('package installs the correct custom pipeline', async () => {
    await new PackageCommand()
      .withDirectory(projectDir)
      .withTarget(buildDir)
      .withFiles([
        'src/html.htl',
        'src/html.pre.js',
      ])
      .withOnlyModified(false)
      .withMinify(false)
      .withCustomPipeline('@adobe/helix-pipeline@1.0.0')
      .run();

    // verify build output
    assertFile(path.resolve(buildDir, 'src', 'html.js'));
    const pipelinePackageJson = path.resolve(buildDir, 'node_modules', '@adobe/helix-pipeline', 'package.json');
    assertFile(pipelinePackageJson);
    const pkg = await fs.readJson(pipelinePackageJson);
    assert.equal(pkg.version, '1.0.0');
  });

  it('package installs the correct custom pipeline via directory', async () => {
    // checkout clone of helix-pipeline
    const pipelineDir = path.resolve(testRoot, 'my-pipeline');
    $.exec(`git clone --branch master --quiet --depth 1 https://github.com/adobe/helix-pipeline.git ${pipelineDir}`);
    const pwd = process.cwd();
    try {
      $.cd(pipelineDir);
      $.exec('npm install --only=prod --prefer-offline --no-bin-links --no-audit --no-fund');
    } finally {
      $.cd(pwd);
    }

    // add some marker to the package.json
    const pkgJson = await fs.readJson(path.resolve(pipelineDir, 'package.json'));
    const version = `${pkgJson.version}-test`;
    pkgJson.version = version;
    await fs.writeJson(path.resolve(pipelineDir, 'package.json'), pkgJson);

    await new PackageCommand()
      .withDirectory(projectDir)
      .withTarget(buildDir)
      .withFiles([
        'src/html.htl',
        'src/html.pre.js',
      ])
      .withOnlyModified(false)
      .withMinify(false)
      .withCustomPipeline('../my-pipeline')
      .run();

    // verify build output
    assertFile(path.resolve(buildDir, 'src', 'html.js'));
    const pipelinePackageJson = path.resolve(buildDir, 'node_modules', '@adobe', 'helix-pipeline', 'package.json');
    assertFile(pipelinePackageJson);
    const pkg = await fs.readJson(pipelinePackageJson);
    assert.equal(pkg.version, version);
  });
});
