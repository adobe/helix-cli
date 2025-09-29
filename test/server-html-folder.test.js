/*
 * Copyright 2025 Adobe. All rights reserved.
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
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
import os from 'os';
import assert from 'assert';
import fs from 'fs/promises';
import fse from 'fs-extra';
import path from 'path';
import { HelixProject } from '../src/server/HelixProject.js';
import {
  Nock, createTestRoot, setupProject,
} from './utils.js';

describe('Helix Server - HTML Folder', () => {
  let nock;
  let testRoot;

  beforeEach(async () => {
    nock = new Nock();
    nock.enableNetConnect(/127.0.0.1/);
    testRoot = await createTestRoot();
  });

  afterEach(async () => {
    if (os.platform() === 'win32') {
      // Note: the async variant of remove hangs on windows, probably due to open filehandle to
      // logs/request.log
      fse.removeSync(testRoot);
    } else {
      await fse.remove(testRoot);
    }
    nock.done();
  });

  it('serves HTML files from drafts folder without extension - reproduce issue 2605', async () => {
    // Setup project with drafts folder
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    // Create drafts folder and test HTML file
    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    await fs.writeFile(path.join(draftsFolder, 'test-page.html'), '<html><body>Test Page</body></html>');
    await fs.writeFile(path.join(draftsFolder, 'index.html'), '<html><body>Index Page</body></html>');

    const project = new HelixProject()
      .withCwd(cwd)
      .withLogger(console)
      .withHttpPort(0)
      .withHtmlFolder('drafts');

    await project.init();
    try {
      await project.start();

      // Test accessing HTML file without extension
      const testPageResponse = await fetch(`http://127.0.0.1:${project.server.port}/drafts/test-page`);
      assert.equal(testPageResponse.status, 200, 'Should return 200 for test-page');
      assert.equal(testPageResponse.headers.get('content-type'), 'text/html; charset=utf-8');

      // Test accessing index without extension
      const indexResponse = await fetch(`http://127.0.0.1:${project.server.port}/drafts/index`);
      assert.equal(indexResponse.status, 200, 'Should return 200 for index');
      assert.equal(indexResponse.headers.get('content-type'), 'text/html; charset=utf-8');

      // Verify response content
      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/test-page`);
      const content = await response.text();
      assert.ok(content.includes('Test Page'), 'Response should contain test page content');
    } finally {
      await project.stop();
    }
  });

  it('handles relative project directory correctly - reproduce issue 2605', async () => {
    // This test reproduces the actual issue - when project directory is relative
    const absoluteCwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);
    const originalCwd = process.cwd();

    // Create drafts folder and test HTML file using absolute path
    const draftsFolder = path.join(absoluteCwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    await fs.writeFile(path.join(draftsFolder, 'test-page.html'), '<html><body>Test with Relative Path</body></html>');

    // Change to parent directory and use relative path
    process.chdir(path.dirname(absoluteCwd));
    const relativeCwd = path.basename(absoluteCwd);

    const project = new HelixProject()
      .withCwd(relativeCwd) // Use relative path to reproduce the issue
      .withLogger(console)
      .withHttpPort(0)
      .withHtmlFolder('drafts');

    await project.init();
    try {
      await project.start();

      // This should fail with Forbidden error before the fix
      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/test-page`);
      assert.equal(response.status, 200, 'Should return 200 even with relative project directory');
      assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');

      const content = await response.text();
      assert.ok(content.includes('Test with Relative Path'), 'Response should contain test page content');
    } finally {
      await project.stop();
      // Change back to original directory
      process.chdir(originalCwd);
    }
  });

  it('handles symlinked project directory correctly - git worktree case', async () => {
    // This test simulates the git worktree scenario where paths might involve symlinks
    const actualCwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    // Create drafts folder and test HTML file
    const draftsFolder = path.join(actualCwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    await fs.writeFile(path.join(draftsFolder, 'worktree-test.html'), '<html><body>Worktree Test</body></html>');

    // Create a symlink to simulate worktree-like behavior
    const symlinkPath = path.join(testRoot, 'symlinked-project');
    await fs.symlink(actualCwd, symlinkPath);

    const project = new HelixProject()
      .withCwd(symlinkPath) // Use symlinked path
      .withLogger(console)
      .withHttpPort(0)
      .withHtmlFolder('drafts');

    await project.init();
    try {
      await project.start();

      // This should work even with symlinked directories
      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/worktree-test`);
      assert.equal(response.status, 200, 'Should return 200 even with symlinked project directory');
      assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');

      const content = await response.text();
      assert.ok(content.includes('Worktree Test'), 'Response should contain test page content');
    } finally {
      await project.stop();
    }
  });

  it('handles paths with nested directories correctly', async () => {
    // This test ensures nested paths work
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    // Create drafts folder with nested structure
    const draftsFolder = path.join(cwd, 'drafts');
    const nestedFolder = path.join(draftsFolder, 'nested');
    await fs.mkdir(nestedFolder, { recursive: true });
    await fs.writeFile(path.join(nestedFolder, 'page.html'), '<html><body>Nested Page</body></html>');

    const project = new HelixProject()
      .withCwd(cwd)
      .withLogger(console)
      .withHttpPort(0)
      .withHtmlFolder('drafts');

    await project.init();
    try {
      await project.start();

      // Test accessing nested HTML file without extension
      const nestedResponse = await fetch(`http://127.0.0.1:${project.server.port}/drafts/nested/page`);
      assert.equal(nestedResponse.status, 200, 'Should return 200 for nested/page');
      assert.equal(nestedResponse.headers.get('content-type'), 'text/html; charset=utf-8');

      // Verify response content
      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/nested/page`);
      const content = await response.text();
      assert.ok(content.includes('Nested Page'), 'Response should contain nested page content');
    } finally {
      await project.stop();
    }
  });
});
