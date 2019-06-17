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
const path = require('path');
const { Logger } = require('@adobe/helix-shared');
const { createTestRoot, assertZipEntries } = require('./utils.js');
const BuildCommand = require('../src/build.cmd.js');
const PackageCommand = require('../src/package.cmd.js');

describe('hlx package (Integration)', () => {
  let testRoot;
  let hlxDir;
  let buildDir;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    hlxDir = path.resolve(testRoot, '.hlx');
    buildDir = path.resolve(hlxDir, 'build');
  });

  afterEach(() => {
    fs.remove(testRoot);
  });

  it('package creates correct package', async () => {
    await new BuildCommand()
      .withFiles([
        'test/integration/src/html.htl',
        'test/integration/src/html.pre.js',
        'test/integration/src/helper.js',
        'test/integration/src/utils/another_helper.js',
        'test/integration/src/third_helper.js',
      ])
      .withTargetDir(buildDir)
      .run();

    const created = {};
    const ignored = {};
    await new PackageCommand()
      .withDirectory(testRoot)
      .withTarget(buildDir)
      .withOnlyModified(false)
      .withStatic('both')
      .withMinify(false)
      .on('create-package', (info) => {
        created[info.name] = true;
      })
      .on('ignore-package', (info) => {
        ignored[info.name] = true;
      })
      .run();

    assert.deepEqual(created, {
      html: true,
      static: true,
    }, 'created packages');
    assert.deepEqual(ignored, {}, 'ignored packages');

    await assertZipEntries(
      path.resolve(buildDir, 'html.zip'),
      ['package.json', 'html.js'],
    );
    await assertZipEntries(
      path.resolve(buildDir, 'static.zip'),
      ['package.json', 'static.js'],
    );

    // execute html script
    {
      const bundle = path.resolve(buildDir, 'html.bundle.js');
      // eslint-disable-next-line global-require,import/no-dynamic-require
      const { main } = require(bundle);
      const ret = await main({
        path: '/README.md',
        content: {
          body: '# foo',
        },
      });
      delete ret.headers['Server-Timing'];
      assert.deepEqual(ret, {
        body: "<!DOCTYPE html><html>\n\t<head>\n\t\t<title>Example</title>\n\t\t<link rel=\"related\" href=\"/welcome.txt\">\n\t</head>\n\t<body>\n\t\tNothing happens here, yet.\n\n\t\t<h1>Here are a few things I know:</h1>\n\t\t<dl>\n\t\t\t<dt>Requested Content</dt>\n\t\t\t<dd><code>/README.md</code></dd>\n\n\t\t\t<dt>Title</dt>\n\t\t\t<dd><code>foo</code></dd>\n\t\t</dl>\n\t\t<!-- anyway, here's the full content-->\n\t\t<main>\n\t\t<h1 id=\"foo\">foo</h1>\n\t\t</main>\n\t</body>\n</html>",
        headers: {
          'Cache-Control': 's-maxage=604800',
          'Content-Type': 'text/html',
          Link: '</welcome.txt>; rel="related"',
        },
        statusCode: 200,
      });
      delete require.cache[require.resolve(bundle)];
    }

    // execute static script
    {
      const bundle = path.resolve(buildDir, 'static.bundle.js');
      // eslint-disable-next-line global-require,import/no-dynamic-require
      const { main } = require(bundle);
      const ret = await main({
        path: '/README.md',
        repo: 'helix-cli',
        owner: 'adobe',
      });
      assert.deepEqual(ret, {
        body: 'forbidden.',
        headers: {
          'Cache-Control': 'max-age=300',
          'Content-Type': 'text/plain',
        },
        statusCode: 403,
      });
      delete require.cache[require.resolve(bundle)];
    }
  }).timeout(60000);

  it('package creates correct package (but excludes static)', async () => {
    await new BuildCommand()
      .withFiles([
        'test/integration/src/html.htl',
        'test/integration/src/html.pre.js',
        'test/integration/src/helper.js',
        'test/integration/src/utils/another_helper.js',
        'test/integration/src/third_helper.js',
      ])
      .withTargetDir(buildDir)
      .run();

    const created = {};
    const ignored = {};
    await new PackageCommand()
      .withDirectory(testRoot)
      .withTarget(buildDir)
      .withOnlyModified(false)
      .withStatic('bind')
      .withMinify(false)
      .on('create-package', (info) => {
        created[info.name] = true;
      })
      .on('ignore-package', (info) => {
        ignored[info.name] = true;
      })
      .run();

    assert.deepEqual(created, {
      html: true,
    }, 'created packages');
    assert.deepEqual(ignored, {}, 'ignored packages');

    await assertZipEntries(
      path.resolve(buildDir, 'html.zip'),
      ['package.json', 'html.js'],
    );
    assert.ok(!fs.existsSync(path.resolve(buildDir, 'static.zip')), 'static.zip should not get created');
  }).timeout(60000);

  it('package does not recreate existing package', async () => {
    await new BuildCommand()
      .withFiles([
        'test/integration/src/helper.js',
        'test/integration/src/xml.js',
      ])
      .withTargetDir(buildDir)
      .run();

    await new PackageCommand()
      .withDirectory(testRoot)
      .withTarget(buildDir)
      .withOnlyModified(true)
      .withMinify(false)
      .run();

    await assertZipEntries(
      path.resolve(buildDir, 'xml.zip'),
      ['package.json', 'xml.js'],
    );

    const created = {};
    const ignored = {};
    await new PackageCommand()
      .withDirectory(testRoot)
      .withTarget(buildDir)
      .withOnlyModified(true)
      .withMinify(false)
      .on('create-package', (info) => {
        created[info.name] = true;
      })
      .on('ignore-package', (info) => {
        ignored[info.name] = true;
      })
      .run();

    assert.deepEqual(created, {}, 'created packages');
    assert.deepEqual(ignored, {
      xml: true,
      static: true,
    }, 'ignored packages');
  }).timeout(60000);

  it('package reports bundling errors and warnings', async () => {
    const logger = Logger.getTestLogger();
    await new BuildCommand()
      .withFiles([
        'test/integration/src/broken_html.pre.js',
      ])
      .withTargetDir(buildDir)
      .run();

    await new PackageCommand(logger)
      .withDirectory(testRoot)
      .withTarget(buildDir)
      .withOnlyModified(true)
      .withMinify(false)
      .run();

    const log = await logger.getOutput();
    assert.ok(/Module not found: Error: Can't resolve 'does-not-exist'/.test(log));
    assert.ok(/Critical dependency: the request of a dependency is an expression/.test(log));
  }).timeout(60000);
});
