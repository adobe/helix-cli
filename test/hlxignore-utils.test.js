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
import assert from 'assert';
import path from 'path';
import os from 'os';
import fse from 'fs-extra';
import HlxIgnore from '../src/hlxignore-utils.js';

describe('HlxIgnore Tests', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fse.mkdtemp(path.join(os.tmpdir(), 'hlxignore-test-'));
  });

  afterEach(async () => {
    await fse.remove(tempDir);
  });

  it('should return false for isIgnored when .hlxignore does not exist', async () => {
    const hlxIgnore = new HlxIgnore(tempDir);
    const result = await hlxIgnore.isIgnored(path.join(tempDir, 'test.txt'));
    assert.strictEqual(result, false);
  });

  it('should properly ignore files matching patterns in .hlxignore', async () => {
    // Create .hlxignore file with patterns
    const hlxIgnoreContent = `# Comment line
*.tmp
node_modules/
build/**/*.js
secret.txt
`;
    await fse.writeFile(path.join(tempDir, '.hlxignore'), hlxIgnoreContent);

    const hlxIgnore = new HlxIgnore(tempDir);

    // Test various patterns
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'file.tmp')), true, 'Should ignore *.tmp files');
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'node_modules', 'package.json')), true, 'Should ignore node_modules/');
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'build', 'dist', 'app.js')), true, 'Should ignore build/**/*.js');
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'secret.txt')), true, 'Should ignore secret.txt');

    // Files that should not be ignored
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'file.txt')), false, 'Should not ignore regular files');
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'src', 'app.js')), false, 'Should not ignore src/*.js');
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'public.txt')), false, 'Should not ignore public.txt');
  });

  it('should support gitignore-style patterns', async () => {
    const hlxIgnoreContent = `# Ignore all .log files
*.log
# But not important.log
!important.log
# Ignore temp directory
/temp/
`;
    await fse.writeFile(path.join(tempDir, '.hlxignore'), hlxIgnoreContent);

    const hlxIgnore = new HlxIgnore(tempDir);

    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'debug.log')), true, 'Should ignore .log files');
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'important.log')), false, 'Should not ignore important.log (negation)');
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'temp', 'file.txt')), true, 'Should ignore files in temp/');
  });

  it('should reload .hlxignore when reload() is called', async () => {
    const hlxIgnorePath = path.join(tempDir, '.hlxignore');
    await fse.writeFile(hlxIgnorePath, '*.old');

    const hlxIgnore = new HlxIgnore(tempDir);

    // First check
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'file.old')), true);
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'file.new')), false);

    // Update .hlxignore
    await fse.writeFile(hlxIgnorePath, '*.new');
    await hlxIgnore.reload();

    // Check after reload
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'file.old')), false);
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'file.new')), true);
  });

  it('should handle malformed .hlxignore gracefully', async () => {
    // Create a .hlxignore that exists but might have issues
    await fse.writeFile(path.join(tempDir, '.hlxignore'), '\0\0\0');

    const hlxIgnore = new HlxIgnore(tempDir);
    // Should not throw an error
    const result = await hlxIgnore.isIgnored(path.join(tempDir, 'test.txt'));
    assert.strictEqual(typeof result, 'boolean');
  });

  it('should handle relative paths correctly', async () => {
    await fse.writeFile(path.join(tempDir, '.hlxignore'), 'src/**/*.test.js');

    const hlxIgnore = new HlxIgnore(tempDir);

    // Test with various path formats
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'src', 'utils', 'helper.test.js')), true);
    assert.strictEqual(await hlxIgnore.isIgnored(path.join(tempDir, 'src', 'utils', 'helper.js')), false);
  });
});
