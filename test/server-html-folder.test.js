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

  it('extracts metadata and generates meta tags', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    // Create drafts folder and .plain.html file with metadata
    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    const htmlWithMetadata = `<div>
  <div class="metadata">
    <div>
      <div>title</div>
      <div>Test Page Title</div>
    </div>
    <div>
      <div>description</div>
      <div>This is a test description</div>
    </div>
  </div>
</div>
<p>Main content here</p>`;
    await fs.writeFile(path.join(draftsFolder, 'with-metadata.plain.html'), htmlWithMetadata);

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

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/with-metadata`);
      assert.equal(response.status, 200);

      const content = await response.text();
      // Verify meta tags are present
      assert.ok(content.includes('<title>Test Page Title</title>'), 'Should have title tag');
      assert.ok(content.includes('<meta name="title" content="Test Page Title">'), 'Should have standard title meta tag');
      assert.ok(content.includes('<meta property="og:title" content="Test Page Title">'), 'Should have og:title meta tag');
      assert.ok(content.includes('<meta name="description" content="This is a test description">'), 'Should have standard description meta tag');
      assert.ok(content.includes('<meta property="og:description" content="This is a test description">'), 'Should have og:description meta tag');

      // Verify metadata block is removed from content
      assert.ok(!content.includes('class="metadata"'), 'Should not contain metadata class in body');
      assert.ok(content.includes('<p>Main content here</p>'), 'Should contain main content');
    } finally {
      await project.stop();
    }
  });

  it('extracts image src from img tags in metadata', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    const htmlWithImage = `<div>
  <div class="metadata">
    <div>
      <div>image</div>
      <div><img src="https://example.com/test.png" alt="Test Image"></div>
    </div>
  </div>
</div>
<p>Content</p>`;
    await fs.writeFile(path.join(draftsFolder, 'with-image.plain.html'), htmlWithImage);

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

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/with-image`);
      const content = await response.text();

      // Verify image src is extracted
      assert.ok(content.includes('<meta name="image" content="https://example.com/test.png">'), 'Should extract img src to meta tag');
      assert.ok(content.includes('<meta property="og:image" content="https://example.com/test.png">'), 'Should have og:image meta tag');
      assert.ok(!content.includes('<img'), 'Should not contain img tag in body');
    } finally {
      await project.stop();
    }
  });

  it('strips HTML tags from metadata values', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    const htmlWithTags = `<div>
  <div class="metadata">
    <div>
      <div>author</div>
      <div><strong>John</strong> <em>Doe</em></div>
    </div>
  </div>
</div>
<p>Content</p>`;
    await fs.writeFile(path.join(draftsFolder, 'with-html.plain.html'), htmlWithTags);

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

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/with-html`);
      const content = await response.text();

      // Verify HTML is stripped, text is kept
      assert.ok(content.includes('<meta name="author" content="John Doe">'), 'Should strip HTML and keep text');
      assert.ok(!content.includes('<strong>'), 'Should not contain HTML tags in meta value');
    } finally {
      await project.stop();
    }
  });

  it('works without metadata block', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    await fs.writeFile(path.join(draftsFolder, 'no-metadata.plain.html'), '<p>Just content</p>');

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

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/no-metadata`);
      assert.equal(response.status, 200);

      const content = await response.text();
      assert.ok(content.includes('<p>Just content</p>'), 'Should contain content');
      assert.ok(content.includes('<main>'), 'Should have HTML structure');
    } finally {
      await project.stop();
    }
  });

  it('escapes special characters in metadata values', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    const htmlWithSpecialChars = `<div>
  <div class="metadata">
    <div>
      <div>title</div>
      <div>Title with "quotes" & ampersand</div>
    </div>
  </div>
</div>
<p>Content</p>`;
    await fs.writeFile(path.join(draftsFolder, 'special-chars.plain.html'), htmlWithSpecialChars);

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

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/special-chars`);
      const content = await response.text();

      // Verify special characters are escaped
      assert.ok(content.includes('&quot;quotes&quot;'), 'Should escape quotes');
      assert.ok(content.includes('&amp;'), 'Should escape ampersand');
    } finally {
      await project.stop();
    }
  });

  it('only generates og: tags for common fields', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    const htmlWithFields = `<div>
  <div class="metadata">
    <div>
      <div>title</div>
      <div>Page Title</div>
    </div>
    <div>
      <div>author</div>
      <div>John Doe</div>
    </div>
    <div>
      <div>keywords</div>
      <div>test, keywords</div>
    </div>
  </div>
</div>
<p>Content</p>`;
    await fs.writeFile(path.join(draftsFolder, 'og-fields.plain.html'), htmlWithFields);

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

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/og-fields`);
      const content = await response.text();

      // title should have both
      assert.ok(content.includes('<meta name="title"'), 'Should have name=title');
      assert.ok(content.includes('<meta property="og:title"'), 'Should have og:title');

      // author should only have name=
      assert.ok(content.includes('<meta name="author"'), 'Should have name=author');
      assert.ok(!content.includes('og:author'), 'Should NOT have og:author');

      // keywords should only have name=
      assert.ok(content.includes('<meta name="keywords"'), 'Should have name=keywords');
      assert.ok(!content.includes('og:keywords'), 'Should NOT have og:keywords');
    } finally {
      await project.stop();
    }
  });

  it('uses default title from first H1 when not specified', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    const htmlWithH1 = `<h1>Page Heading</h1>
<p>This is a very long paragraph with more than ten words to test description extraction.</p>
<p>More content</p>`;
    await fs.writeFile(path.join(draftsFolder, 'default-title.plain.html'), htmlWithH1);

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

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/default-title`);
      const content = await response.text();

      // Should use H1 as default title
      assert.ok(content.includes('<meta name="title" content="Page Heading">'), 'Should use H1 as default title');
      assert.ok(content.includes('<meta property="og:title" content="Page Heading">'), 'Should have og:title from H1');
    } finally {
      await project.stop();
    }
  });

  it('uses default description from first paragraph with 10+ words', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    const htmlWithP = `<p>This is a very long paragraph with more than ten words for description.</p>
<p>More content</p>`;
    await fs.writeFile(path.join(draftsFolder, 'default-desc.plain.html'), htmlWithP);

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

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/default-desc`);
      const content = await response.text();

      // Should use first paragraph as default description
      assert.ok(content.includes('This is a very long paragraph with more than ten words for description.'), 'Should use paragraph as default description');
    } finally {
      await project.stop();
    }
  });

  it('uses default image from first img tag', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    const htmlWithImg = `<p>Content here</p>
<img src="https://example.com/first-image.png" alt="First">
<img src="https://example.com/second-image.png" alt="Second">`;
    await fs.writeFile(path.join(draftsFolder, 'default-image.plain.html'), htmlWithImg);

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

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/default-image`);
      const content = await response.text();

      // Should use first image as default
      assert.ok(content.includes('<meta name="image" content="https://example.com/first-image.png">'), 'Should use first image as default');
      // Note: second image will still be in the content body, just not in meta tags
      assert.ok(!content.includes('<meta name="image" content="https://example.com/second-image.png">'), 'Should not use second image in meta tags');
    } finally {
      await project.stop();
    }
  });

  it('handles title:suffix by appending to title', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    const htmlWithSuffix = `<div>
  <div class="metadata">
    <div>
      <div>title</div>
      <div>My Page</div>
    </div>
    <div>
      <div>title:suffix</div>
      <div>| My Site</div>
    </div>
  </div>
</div>
<p>Content</p>`;
    await fs.writeFile(path.join(draftsFolder, 'title-suffix.plain.html'), htmlWithSuffix);

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

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/title-suffix`);
      const content = await response.text();

      // Title should include suffix
      assert.ok(content.includes('<title>My Page | My Site</title>'), 'Should have title tag with suffix');
      assert.ok(content.includes('<meta name="title" content="My Page | My Site">'), 'Should append suffix to title');
      assert.ok(content.includes('<meta property="og:title" content="My Page | My Site">'), 'Should have og:title with suffix');
      assert.ok(!content.includes('title:suffix'), 'Should not include title:suffix as separate meta tag');
    } finally {
      await project.stop();
    }
  });

  it('handles canonical URL with og:url and twitter:url', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    const htmlWithCanonical = `<div>
  <div class="metadata">
    <div>
      <div>canonical</div>
      <div>https://example.com/canonical-page</div>
    </div>
  </div>
</div>
<p>Content</p>`;
    await fs.writeFile(path.join(draftsFolder, 'canonical.plain.html'), htmlWithCanonical);

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

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/canonical`);
      const content = await response.text();

      // Should have link rel=canonical
      assert.ok(content.includes('<link rel="canonical" href="https://example.com/canonical-page">'), 'Should have canonical link');
      assert.ok(content.includes('<meta property="og:url" content="https://example.com/canonical-page">'), 'Should have og:url');
      assert.ok(content.includes('<meta name="twitter:url" content="https://example.com/canonical-page">'), 'Should have twitter:url');
      assert.ok(!content.includes('<meta name="canonical"'), 'Should not have name=canonical meta tag');
    } finally {
      await project.stop();
    }
  });

  it('handles tags property as article:tag meta tags', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    const htmlWithTags = `<div>
  <div class="metadata">
    <div>
      <div>tags</div>
      <div>javascript, nodejs, web development</div>
    </div>
  </div>
</div>
<p>Content</p>`;
    await fs.writeFile(path.join(draftsFolder, 'with-tags.plain.html'), htmlWithTags);

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

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/with-tags`);
      const content = await response.text();

      // Should have article:tag for each tag
      assert.ok(content.includes('<meta property="article:tag" content="javascript">'), 'Should have article:tag for javascript');
      assert.ok(content.includes('<meta property="article:tag" content="nodejs">'), 'Should have article:tag for nodejs');
      assert.ok(content.includes('<meta property="article:tag" content="web development">'), 'Should have article:tag for web development');
      assert.ok(!content.includes('<meta name="tags"'), 'Should not have name=tags meta tag');
    } finally {
      await project.stop();
    }
  });

  it('uses /default-meta-image.png when no image in content or metadata', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    const htmlNoImage = '<p>Content without images</p>';
    await fs.writeFile(path.join(draftsFolder, 'no-image.plain.html'), htmlNoImage);

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

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/no-image`);
      const content = await response.text();

      // Should use default image
      assert.ok(content.includes('<meta name="image" content="/default-meta-image.png">'), 'Should use default image');
      assert.ok(content.includes('<meta property="og:image" content="/default-meta-image.png">'), 'Should have og:image with default');
    } finally {
      await project.stop();
    }
  });

  it('merges remote and local head.html for .plain.html files', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    const htmlWithMetadata = `<div>
  <div class="metadata">
    <div>
      <div>title</div>
      <div>Test Page</div>
    </div>
  </div>
</div>
<p>Content</p>`;
    await fs.writeFile(path.join(draftsFolder, 'remote-head.plain.html'), htmlWithMetadata);

    // Create local head.html
    await fs.writeFile(path.join(cwd, 'head.html'), '<meta name="local" content="local-value">');

    // Mock remote head.html with different content
    nock('https://main--foo--bar.aem.page')
      .get('/head.html')
      .reply(200, '<meta name="remote" content="remote-value">');

    const project = new HelixProject()
      .withCwd(cwd)
      .withLogger(console)
      .withHttpPort(0)
      .withProxyUrl('https://main--foo--bar.aem.page/')
      .withHtmlFolder('drafts');

    await project.init();
    try {
      await project.start();

      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/remote-head`);
      assert.equal(response.status, 200);

      const content = await response.text();
      // Should have local head.html content (HeadHtmlSupport uses local when both exist)
      assert.ok(content.includes('<meta name="local" content="local-value">'), 'Should include local head.html');
      // Should have extracted metadata
      assert.ok(content.includes('<meta name="title" content="Test Page">'), 'Should have metadata');
    } finally {
      await project.stop();
    }
  });

  it('serves index.html for directory requests with trailing slash', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    const subFolder = path.join(draftsFolder, 'subfolder');
    await fs.mkdir(subFolder, { recursive: true });
    await fs.writeFile(path.join(subFolder, 'index.html'), '<html><body>Subfolder Index</body></html>');

    const project = new HelixProject()
      .withCwd(cwd)
      .withLogger(console)
      .withHttpPort(0)
      .withProxyUrl('https://main--foo--bar.aem.page/')
      .withHtmlFolder('drafts');

    await project.init();
    try {
      await project.start();

      // Request with trailing slash should serve index.html
      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/subfolder/`);
      assert.equal(response.status, 200);

      const content = await response.text();
      assert.ok(content.includes('Subfolder Index'), 'Should serve index.html for directory request');
    } finally {
      await project.stop();
    }
  });

  it('serves index.plain.html for directory requests with trailing slash', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    const subFolder = path.join(draftsFolder, 'section');
    await fs.mkdir(subFolder, { recursive: true });
    await fs.writeFile(path.join(subFolder, 'index.plain.html'), '<p>Section index content</p>');

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

      // Request with trailing slash should serve index.plain.html
      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/section/`);
      assert.equal(response.status, 200);

      const content = await response.text();
      assert.ok(content.includes('<main>'), 'Should have HTML structure');
      assert.ok(content.includes('<p>Section index content</p>'), 'Should serve index.plain.html for directory request');
    } finally {
      await project.stop();
    }
  });

  it('serves index.html when requesting the html-folder root', async () => {
    const cwd = await setupProject(path.join(__rootdir, 'test', 'fixtures', 'project'), testRoot);

    const draftsFolder = path.join(cwd, 'drafts');
    await fs.mkdir(draftsFolder, { recursive: true });
    await fs.writeFile(path.join(draftsFolder, 'index.plain.html'), '<p>Drafts root index</p>');

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

      // Request for /drafts/ should serve drafts/index.plain.html
      const response = await fetch(`http://127.0.0.1:${project.server.port}/drafts/`);
      assert.equal(response.status, 200);

      const content = await response.text();
      assert.ok(content.includes('<p>Drafts root index</p>'), 'Should serve index.plain.html for html-folder root');
    } finally {
      await project.stop();
    }
  });
});
