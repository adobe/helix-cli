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
import content from '../../src/content/content.js';
import clone from '../../src/content/clone.js';
import push from '../../src/content/push.js';
import status from '../../src/content/status.js';
import diff from '../../src/content/diff.js';
import mergeCmd from '../../src/content/merge.js';

describe('content()', () => {
  it('returns command named content', () => {
    const cmd = content();
    assert.strictEqual(cmd.command, 'content');
  });

  it('has a description', () => {
    const cmd = content();
    assert.ok(cmd.description && cmd.description.length > 0);
  });

  it('has a builder function', () => {
    const cmd = content();
    assert.strictEqual(typeof cmd.builder, 'function');
  });

  it('has a handler function', () => {
    const cmd = content();
    assert.strictEqual(typeof cmd.handler, 'function');
  });

  it('builder registers subcommands', () => {
    const cmd = content();
    const registered = [];
    const chainable = {
      command: (sub) => {
        registered.push(sub);
        return chainable;
      },
      demandCommand: () => chainable,
      help: () => chainable,
    };
    cmd.builder(chainable);
    assert.ok(registered.length > 0);
  });
});

describe('clone()', () => {
  it('returns command named clone', () => {
    const cmd = clone();
    assert.strictEqual(cmd.command, 'clone');
  });

  it('has a description', () => {
    const cmd = clone();
    assert.ok(cmd.description && cmd.description.length > 0);
  });

  it('has a builder that registers path, all, token, and force options', () => {
    const cmd = clone();
    const registered = {};
    const chainable = {
      option: (name, opts) => {
        registered[name] = opts;
        return chainable;
      },
      check: () => chainable,
      help: () => chainable,
    };
    cmd.builder(chainable);
    assert.ok('path' in registered);
    assert.ok('all' in registered);
    assert.ok('token' in registered);
    assert.ok('force' in registered);
  });

  it('executor setter replaces internal executor', () => {
    const cmd = clone();
    const mockExecutor = {
      withToken: () => mockExecutor,
      withForce: () => mockExecutor,
      withRootPath: () => mockExecutor,
      run: async () => {},
    };
    cmd.executor = mockExecutor;
  });

  it('has a handler function', () => {
    const cmd = clone();
    assert.strictEqual(typeof cmd.handler, 'function');
  });

  it('handler calls executor when executor is set', async () => {
    const cmd = clone();
    let ranWith;
    let rootPathArg;
    cmd.executor = {
      withToken: (t) => {
        ranWith = t;
        return {
          withForce: () => ({
            withRootPath: (rp) => {
              rootPathArg = rp;
              return { run: async () => {} };
            },
          }),
        };
      },
    };
    await cmd.handler({
      token: 'abc', force: false, all: false, path: '/ca/fr_ca',
    });
    assert.strictEqual(ranWith, 'abc');
    assert.strictEqual(rootPathArg, '/ca/fr_ca');
  });
});

describe('push()', () => {
  it('returns command named push', () => {
    const cmd = push();
    assert.strictEqual(cmd.command, 'push');
  });

  it('has a description', () => {
    const cmd = push();
    assert.ok(cmd.description && cmd.description.length > 0);
  });

  it('has a builder that registers --token, --path, --force, --dry-run options', () => {
    const cmd = push();
    const registered = {};
    const chainable = {
      option: (name, opts) => {
        registered[name] = opts;
        return chainable;
      },
      help: () => chainable,
    };
    cmd.builder(chainable);
    assert.ok('token' in registered);
    assert.ok('force' in registered);
    assert.ok('dry-run' in registered);
    assert.ok('path' in registered);
  });

  it('executor setter works', () => {
    const cmd = push();
    cmd.executor = { withToken: () => {}, run: async () => {} };
  });

  it('handler calls executor when set', async () => {
    const cmd = push();
    let called = false;
    cmd.executor = {
      withToken: () => ({
        withPath: () => ({
          withForce: () => ({
            withDryRun: () => ({
              run: async () => {
                called = true;
              },
            }),
          }),
        }),
      }),
    };
    await cmd.handler({
      token: 't', path: null, force: false, dryRun: false,
    });
    assert.strictEqual(called, true);
  });
});

describe('status()', () => {
  it('returns command named status', () => {
    const cmd = status();
    assert.strictEqual(cmd.command, 'status');
  });

  it('has a description', () => {
    const cmd = status();
    assert.ok(cmd.description && cmd.description.length > 0);
  });

  it('has a builder function', () => {
    const cmd = status();
    assert.strictEqual(typeof cmd.builder, 'function');
  });

  it('executor setter works', () => {
    const cmd = status();
    cmd.executor = { run: async () => {} };
  });

  it('handler calls executor.run() when set', async () => {
    const cmd = status();
    let called = false;
    cmd.executor = {
      run: async () => {
        called = true;
      },
    };
    await cmd.handler({});
    assert.strictEqual(called, true);
  });
});

describe('diff()', () => {
  it('returns command named diff [path]', () => {
    const cmd = diff();
    assert.strictEqual(cmd.command, 'diff [path]');
  });

  it('has a description', () => {
    const cmd = diff();
    assert.ok(cmd.description && cmd.description.length > 0);
  });

  it('executor setter works', () => {
    const cmd = diff();
    cmd.executor = {
      withToken: () => {},
      withFilePath: () => {},
      run: async () => {},
    };
  });

  it('handler calls executor when set', async () => {
    const cmd = diff();
    let called = false;
    cmd.executor = {
      withToken: () => ({
        withFilePath: () => ({
          run: async () => {
            called = true;
          },
        }),
      }),
    };
    await cmd.handler({ token: 't', path: null });
    assert.strictEqual(called, true);
  });
});

describe('mergeCmd()', () => {
  it('returns command named merge [path]', () => {
    const cmd = mergeCmd();
    assert.strictEqual(cmd.command, 'merge [path]');
  });

  it('has a description', () => {
    const cmd = mergeCmd();
    assert.ok(cmd.description && cmd.description.length > 0);
  });

  it('executor setter works', () => {
    const cmd = mergeCmd();
    cmd.executor = {
      withToken: () => {},
      withFilePath: () => {},
      run: async () => {},
    };
  });

  it('handler calls executor when set', async () => {
    const cmd = mergeCmd();
    let called = false;
    cmd.executor = {
      withToken: () => ({
        withFilePath: () => ({
          run: async () => {
            called = true;
          },
        }),
      }),
    };
    await cmd.handler({ token: 't', path: null });
    assert.strictEqual(called, true);
  });
});
