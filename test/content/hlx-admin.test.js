/*
 * Copyright 2026 Adobe. All rights reserved.
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
import { branchPathAndQuery, toAdminBulkPath } from '../../src/content/hlx-admin.js';

describe('hlx-admin', () => {
  describe('branchPathAndQuery()', () => {
    it('uses ref in the path for simple branch names', () => {
      const { pathRef, search } = branchPathAndQuery('main');
      assert.strictEqual(pathRef, 'main');
      assert.strictEqual(search, '');
    });

    it('uses branch query for slashes', () => {
      const { pathRef, search } = branchPathAndQuery('release/v2');
      assert.strictEqual(pathRef, 'main');
      assert.strictEqual(search, '?branch=release%2Fv2');
    });

    it('uses branch query for uppercase', () => {
      const { pathRef, search } = branchPathAndQuery('Feature');
      assert.strictEqual(pathRef, 'main');
      assert.strictEqual(search, '?branch=Feature');
    });
  });

  describe('toAdminBulkPath()', () => {
    it('strips .html suffix (case-insensitive)', () => {
      assert.strictEqual(toAdminBulkPath('/my/path.html'), '/my/path');
      assert.strictEqual(toAdminBulkPath('/my/path.HTML'), '/my/path');
    });

    it('strips root index.html to /index', () => {
      assert.strictEqual(toAdminBulkPath('/index.html'), '/index');
    });

    it('leaves non-html paths unchanged', () => {
      assert.strictEqual(toAdminBulkPath('/metadata.json'), '/metadata.json');
      assert.strictEqual(toAdminBulkPath('/assets/x.jpg'), '/assets/x.jpg');
    });
  });
});
