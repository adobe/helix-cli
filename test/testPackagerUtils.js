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
const { flattenDependencies } = require('../src/packager-utils.js');

describe('Test Package utils', () => {
  it('can resolve complex dependency tree', async () => {
    const scripts = [
      {
        main: 'a',
        requires: ['b', 'c'],
      },
      {
        main: 'b',
        requires: [],
      },
      {
        main: 'c',
        requires: ['d'],
      },
      {
        main: 'd',
        requires: [],
      },
      {
        main: 'f',
        requires: ['c'],
      },
    ];

    const result = flattenDependencies(scripts);
    const expected = [
      {
        main: 'a',
        requires: ['b', 'c', 'd'],
      },
      {
        main: 'f',
        requires: ['c', 'd'],
      },
    ];
    assert.deepEqual(result, expected, 'script resolution');
  });

  it('can resolve cyclic dependency tree', async () => {
    const scripts = [
      {
        main: 'a',
        requires: ['b', 'c'],
      },
      {
        main: 'b',
        requires: [],
      },
      {
        main: 'c',
        requires: ['d'],
      },
      {
        main: 'd',
        requires: ['a'],
      },
      {
        main: 'f',
        requires: ['c'],
      },
    ];

    try {
      flattenDependencies(scripts);
      assert.fail('cyclic dependency should fail.');
    } catch (e) {
      assert.equal(e.message, 'Cyclic dependency detected: a -> c -> d -> a');
    }
  });

  it('fails for missing dependency', async () => {
    const scripts = [
      {
        main: 'a',
        requires: ['b', 'c'],
      },
      {
        main: 'b',
        requires: [],
      },
      {
        main: 'c',
        requires: ['d'],
      },
    ];

    try {
      flattenDependencies(scripts);
      assert.fail('cyclic dependency should fail.');
    } catch (e) {
      assert.equal(e.message, 'internal dependency from c to d not found');
    }
  });
});
