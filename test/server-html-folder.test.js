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

  it('handles subdirectory worktree correctly - worktree in .conductor', async () => {
    // This test simulates a worktree in a subdirectory of the main repo (e.g., .conductor/)
    const mainRepoPath = path.join(testRoot, 'main-repo');
    const worktreePath = path.join(mainRepoPath, '.conductor', 'worktree');

    // Setup the directory structure
    await fs.mkdir(worktreePath, { recursive: true });

    // Create drafts folder and HTML file in the worktree
    const draftsFolder = path.join(worktreePath, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    await fs.writeFile(path.join(draftsFolder, 'subdirectory-test.html'), '<html><body>Subdirectory Worktree Test</body></html>');

    const project = new HelixProject()
      .withCwd(worktreePath)
      .withLogger(console)
      .withHttpPort(0)
      .withHtmlFolder('drafts');

    await project.init();
    try {
      await project.start();

      // This should work even when the worktree is in a subdirectory
      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/subdirectory-test`);
      assert.equal(response.status, 200, 'Should return 200 for worktree in subdirectory');
      assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');

      const content = await response.text();
      assert.ok(content.includes('Subdirectory Worktree Test'), 'Response should contain test page content');
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

  it('serves .plain.html files wrapped with head.html', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    // Create drafts folder and .plain.html file
    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    await fs.writeFile(path.join(draftsFolder, 'plain-page.plain.html'), '<p>Plain content here</p>');

    // Create a local head.html for testing
    await fs.writeFile(path.join(cwd, 'head.html'), '<meta name="test" content="local-head">');

    // Mock the remote head.html request
    nock('https://main--foo--bar.aem.page')
      .get('/head.html')
      .reply(404);

    const project = new HelixProject()
      .withCwd(cwd)
      .withLogger(console)
      .withHttpPort(0)
      .withProxyUrl('https://main--foo--bar.aem.page/')
      .withHtmlFolder('drafts');

    await project.init();
    try {
      await project.start();

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/plain-page`);
      assert.equal(response.status, 200, 'Should return 200 for .plain.html file');
      assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');

      const content = await response.text();
      assert.ok(content.includes('<html><head>'), 'Should include <html><head> wrapper');
      assert.ok(content.includes('</head><body>'), 'Should include </head><body> structure');
      assert.ok(content.includes('<header></header>'), 'Should include empty header');
      assert.ok(content.includes('<main>'), 'Should include main tag');
      assert.ok(content.includes('<p>Plain content here</p>'), 'Should contain plain content in main');
      assert.ok(content.includes('</main>'), 'Should close main tag');
      assert.ok(content.includes('<footer></footer>'), 'Should include empty footer');
      assert.ok(content.includes('</body></html>'), 'Should close body and html tags');
      assert.ok(content.includes('<meta name="test" content="local-head">'), 'Should include head.html content');
    } finally {
      await project.stop();
    }
  });

  it('.html files take precedence over .plain.html', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    // Create drafts folder with both .html and .plain.html
    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    await fs.writeFile(path.join(draftsFolder, 'priority.html'), '<html><body>Regular HTML</body></html>');
    await fs.writeFile(path.join(draftsFolder, 'priority.plain.html'), '<p>Plain HTML</p>');

    const project = new HelixProject()
      .withCwd(cwd)
      .withLogger(console)
      .withHttpPort(0)
      .withProxyUrl('https://main--foo--bar.aem.page/')
      .withHtmlFolder('drafts');

    await project.init();
    try {
      await project.start();

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/priority`);
      assert.equal(response.status, 200);

      const content = await response.text();
      assert.ok(content.includes('Regular HTML'), 'Should serve .html file');
      assert.ok(!content.includes('Plain HTML'), 'Should not serve .plain.html file');
    } finally {
      await project.stop();
    }
  });

  it('.plain.html files support live reload injection', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    // Create drafts folder and .plain.html file
    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    await fs.writeFile(path.join(draftsFolder, 'livereload-test.plain.html'), '<p>Content with livereload</p>');
    await fs.writeFile(path.join(cwd, 'head.html'), '<meta name="test" content="head">');

    // Mock the remote head.html request
    nock('https://main--foo--bar.aem.page')
      .get('/head.html')
      .reply(404);

    const project = new HelixProject()
      .withCwd(cwd)
      .withLogger(console)
      .withHttpPort(0)
      .withProxyUrl('https://main--foo--bar.aem.page/')
      .withHtmlFolder('drafts')
      .withLiveReload(true); // Enable live reload

    await project.init();
    try {
      await project.start();

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/livereload-test`);
      assert.equal(response.status, 200);

      const content = await response.text();
      assert.ok(content.includes('<p>Content with livereload</p>'), 'Should contain plain content');
      assert.ok(content.includes('livereload'), 'Should include livereload script');
      assert.ok(content.includes('LiveReload'), 'Should include LiveReload functionality');
    } finally {
      await project.stop();
    }
  });

  it('.plain.html files work with nested directories', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    // Create nested structure in drafts
    const draftsFolder = path.join(cwd, 'drafts');
    const nestedFolder = path.join(draftsFolder, 'section', 'subsection');
    await fs.mkdir(nestedFolder, { recursive: true });
    await fs.writeFile(path.join(nestedFolder, 'nested.plain.html'), '<p>Nested plain content</p>');
    await fs.writeFile(path.join(cwd, 'head.html'), '<meta name="nested" content="test">');

    // Mock the remote head.html request
    nock('https://main--foo--bar.aem.page')
      .get('/head.html')
      .reply(404);

    const project = new HelixProject()
      .withCwd(cwd)
      .withLogger(console)
      .withHttpPort(0)
      .withProxyUrl('https://main--foo--bar.aem.page/')
      .withHtmlFolder('drafts');

    await project.init();
    try {
      await project.start();

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/section/subsection/nested`);
      assert.equal(response.status, 200);

      const content = await response.text();
      assert.ok(content.includes('<html><head>'), 'Should include HTML structure');
      assert.ok(content.includes('<main>'), 'Should include main tag');
      assert.ok(content.includes('<p>Nested plain content</p>'), 'Should contain nested plain content');
      assert.ok(content.includes('</main>'), 'Should close main tag');
      assert.ok(content.includes('<meta name="nested" content="test">'), 'Should include head.html');
    } finally {
      await project.stop();
    }
  });

  it('.plain.html files respect path traversal protection', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    // Create drafts folder
    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    await fs.writeFile(path.join(draftsFolder, 'safe.plain.html'), '<p>Safe content</p>');

    // Create a file outside drafts folder
    await fs.writeFile(path.join(cwd, 'outside.plain.html'), '<p>Outside content</p>');

    const project = new HelixProject()
      .withCwd(cwd)
      .withLogger(console)
      .withHttpPort(0)
      .withProxyUrl('https://main--foo--bar.aem.page/')
      .withHtmlFolder('drafts');

    await project.init();
    try {
      await project.start();

      // Try to access file outside drafts using path traversal
      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/../outside`);
      assert.notEqual(response.status, 200, 'Should not serve file outside drafts folder');
    } finally {
      await project.stop();
    }
  });

  it('.plain.html files work without local head.html', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    // Create drafts folder and .plain.html file
    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    await fs.writeFile(path.join(draftsFolder, 'no-head.plain.html'), '<p>Content without head</p>');

    // Do NOT create head.html - test with empty head

    // Mock the remote head.html request
    nock('https://main--foo--bar.aem.page')
      .get('/head.html')
      .reply(404);

    const project = new HelixProject()
      .withCwd(cwd)
      .withLogger(console)
      .withHttpPort(0)
      .withProxyUrl('https://main--foo--bar.aem.page/')
      .withHtmlFolder('drafts');

    await project.init();
    try {
      await project.start();

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/no-head`);
      assert.equal(response.status, 200);

      const content = await response.text();
      assert.ok(content.includes('<html><head>'), 'Should include HTML structure');
      assert.ok(content.includes('</head><body>'), 'Should include body tag');
      assert.ok(content.includes('<main>'), 'Should include main tag');
      assert.ok(content.includes('<p>Content without head</p>'), 'Should contain plain content');
      assert.ok(content.includes('</main>'), 'Should close main tag');
    } finally {
      await project.stop();
    }
  });
});
