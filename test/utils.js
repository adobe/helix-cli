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
import assert from 'assert';
import path from 'path';
import net from 'net';
import shell from 'shelljs';
import crypto from 'crypto';
import fse from 'fs-extra';
import nock from 'nock';
import { getFetch } from '../src/fetch-utils.js';

/**
 * init git in integration so that helix-simulator can run
 */
export function initGit(dir, remote, branch) {
  // Ensure the directory exists before trying to cd into it
  fse.ensureDirSync(dir);

  const originalCwd = process.cwd();
  const absoluteDir = path.resolve(dir);

  // Change to the target directory
  try {
    process.chdir(absoluteDir);
  } catch (e) {
    throw new Error(`Failed to change to directory ${absoluteDir}: ${e.message}`);
  }

  shell.exec('git init');
  shell.exec('git checkout -b master');
  shell.exec('git add -A');
  shell.exec('git commit -m"initial commit."');
  if (remote) {
    shell.exec(`git remote add origin ${remote}`);
  }
  if (branch) {
    shell.exec(`git checkout -b ${branch}`);
  }

  // Always try to restore the original directory
  try {
    process.chdir(originalCwd);
  } catch (e) {
    // If we can't change back, at least don't throw - we've done the git init
    // eslint-disable-next-line no-console
    console.error(`Warning: Could not restore directory to ${originalCwd}: ${e.message}`);
  }
}

export function switchBranch(dir, branch) {
  const pwd = shell.pwd();
  shell.cd(dir);
  shell.exec(`git checkout -b ${branch}`);
  shell.cd(pwd);
  // eslint-disable-next-line no-console
  console.log(`switched to branch ${branch} in ${dir}`);
}

export function getBranch(dir) {
  const pwd = shell.pwd();
  shell.cd(dir);
  const { stdout } = shell.exec('git rev-parse --abbrev-ref HEAD');
  shell.cd(pwd);
  // eslint-disable-next-line no-console
  console.log(`The current branch is ${stdout.trim()} in ${dir}`);

  return stdout.trim();
}

export function clearHelixEnv() {
  const deleted = {};
  Object.keys(process.env).filter((key) => key.startsWith(('AEM_'))).forEach((key) => {
    deleted[key] = process.env[key];
    delete process.env[key];
  });
  return deleted;
}

export async function assertHttp(url, status, spec, replacements = []) {
  const resp = await getFetch()(url, {
    cache: 'no-store',
  });
  assert.strictEqual(resp.status, status);
  const data = await resp.text();
  if (spec) {
    if (Array.isArray(spec)) {
      spec.forEach((str) => {
        try {
          assert.equal(data.indexOf(str) >= 0, true);
        } catch (e) {
          assert.fail(`response does not contain string "${str}"`);
        }
      });
    } else {
      let expected = await fse.readFile(path.resolve(__rootdir, 'test', 'specs', spec), 'utf-8');
      replacements.forEach((r) => {
        expected = expected.replace(r.pattern, r.with);
      });
      if (spec.endsWith('.json')) {
        assert.deepStrictEqual(JSON.parse(data), JSON.parse(expected));
      } else {
        assert.strictEqual(data.trim(), expected.trim());
      }
    }
  }
  return data;
}

export async function createTestRoot() {
  const dir = path.resolve(__rootdir, 'test', 'tmp', crypto.randomBytes(16).toString('hex'));
  await fse.ensureDir(dir);
  return dir;
}

export async function setupProject(srcDir, root) {
  const dir = path.resolve(root, path.basename(srcDir));
  await fse.copy(srcDir, dir);
  return dir;
}

export async function wait(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

export async function rawGet(host, port, pathname) {
  return new Promise((resolve, reject) => {
    const response = [];
    const client = net.createConnection({
      host,
      port,
    }, () => {
      client.write(`GET ${pathname}\r\n\r\n`);
    });
    client.on('data', (data) => {
      response.push(data);
    });
    client.on('end', () => {
      resolve(Buffer.concat(response));
    });
    client.on('error', (err) => {
      reject(err);
    });
  });
}

const FSTAB = `
mountpoints:
  /: https://drive.google.com/drive/u/2/folders/1vjng4ahZWph-9oeaMae16P9Kbb3xg4Cg
`;

export function Nock() {
  const scopes = {};

  /** @type RegExp */
  let exclude;
  let unmatched;

  function noMatchHandler(req) {
    if (exclude && exclude.test(req.hostname)) {
      return;
    }
    unmatched.push(req);
  }

  function nocker(url, options) {
    let scope = scopes[url];
    if (!scope) {
      scope = nock(url, options);
      scopes[url] = scope;
    }
    if (!unmatched) {
      unmatched = [];
      nock.emitter.on('no match', noMatchHandler);
    }
    return scope;
  }

  nocker.done = () => {
    try {
      Object.values(scopes).forEach((s) => s.done());
    } finally {
      nock.cleanAll();
    }
    if (unmatched) {
      assert.deepStrictEqual(unmatched.map((req) => req.href || req), []);
      nock.emitter.off('no match', noMatchHandler);
    }
  };

  nocker.fstab = (fstab = FSTAB, owner = 'owner', repo = 'repo') => nocker('https://helix-code-bus.s3.us-east-1.amazonaws.com')
    .get(`/${owner}/${repo}/main/fstab.yaml?x-id=GetObject`)
    .reply(200, fstab);

  nocker.enableNetConnect = (pat) => {
    nock.enableNetConnect(pat);
    exclude = pat;
  };

  return nocker;
}

export function signal(timeout) {
  let res;
  let timer;
  const p = new Promise((resolve) => {
    timer = setTimeout(resolve, timeout);
    res = resolve;
  });
  p.cancel = () => {
    clearTimeout(timer);
    res();
  };
  return p;
}

/**
 * Initialize a git repository with a submodule for testing
 * @param {string} mainDir - Main repository directory
 * @param {string} submoduleName - Name for the submodule
 * @param {string} remote - Optional remote URL for main repo
 * @returns {Object} Object with mainDir and submoduleDir paths
 */
export async function initGitWithSubmodule(mainDir, submoduleName = 'test-submodule', remote = null) {
  // Ensure main directory exists
  await fse.ensureDir(mainDir);

  // Create a separate repo to use as submodule with unique name
  const timestamp = Date.now();
  const submoduleRepoName = `${submoduleName}-repo-${timestamp}`;
  const submoduleRepoDir = path.join(path.dirname(mainDir), submoduleRepoName);

  // Initialize submodule repository
  await fse.ensureDir(submoduleRepoDir);
  await fse.writeFile(path.join(submoduleRepoDir, 'README.md'), `# ${submoduleName}\n`);

  const pwd = shell.pwd();

  // Setup submodule repo
  shell.cd(submoduleRepoDir);
  shell.exec('git init');
  shell.exec('git add README.md');
  shell.exec('git commit -m "Initial submodule commit"');

  // Setup main repo and add submodule
  shell.cd(mainDir);
  shell.exec('git init');
  shell.exec('git checkout -b master');

  // Add some initial content before adding submodule
  await fse.writeFile(path.join(mainDir, 'README.md'), '# Main Repository\n');
  shell.exec('git add README.md');
  shell.exec('git commit -m "Initial main commit"');

  // Add submodule
  shell.exec(`git submodule add "${submoduleRepoDir}" ${submoduleName}`);
  shell.exec('git commit -m "Add submodule"');

  if (remote) {
    shell.exec(`git remote add origin ${remote}`);
  }

  shell.cd(pwd);

  return {
    mainDir,
    submoduleDir: path.join(mainDir, submoduleName),
    submoduleRepoDir, // for cleanup
  };
}

/**
 * Initialize a git repository with a worktree for testing
 * @param {string} mainDir - Main repository directory
 * @param {string} worktreeName - Name for the worktree
 * @param {string} remote - Optional remote URL
 * @returns {Object} Object with mainDir and worktreeDir paths
 */
export async function initGitWithWorktree(mainDir, worktreeName = 'test-worktree', remote = null) {
  // Ensure main directory exists
  await fse.ensureDir(mainDir);

  // Add initial content
  await fse.writeFile(path.join(mainDir, 'README.md'), '# Test Repository\n');
  await fse.writeFile(path.join(mainDir, '.gitignore'), 'node_modules\n');

  const pwd = shell.pwd();

  // Initialize main repository
  shell.cd(mainDir);
  shell.exec('git init');
  shell.exec('git checkout -b master');
  shell.exec('git add -A');
  shell.exec('git commit -m "Initial commit"');

  if (remote) {
    shell.exec(`git remote add origin ${remote}`);
  }

  // Create worktree with unique name to avoid collisions
  const timestamp = Date.now();
  const uniqueWorktreeName = `${worktreeName}-${timestamp}`;
  const worktreeDir = path.join(path.dirname(mainDir), uniqueWorktreeName);
  const branchName = `${uniqueWorktreeName}-branch`;

  shell.exec(`git worktree add "${worktreeDir}" -b ${branchName}`);

  shell.cd(pwd);

  return {
    mainDir,
    worktreeDir,
    worktreeName: uniqueWorktreeName,
    branchName,
  };
}

/**
 * Clean up a git worktree
 * @param {string} mainDir - Main repository directory
 * @param {string} worktreeDir - Worktree directory to remove
 */
export async function cleanupWorktree(mainDir, worktreeDir) {
  const pwd = shell.pwd();
  shell.cd(mainDir);
  shell.exec(`git worktree remove "${worktreeDir}" --force || true`);
  shell.cd(pwd);
  await fse.remove(worktreeDir).catch(() => {});
}

/**
 * Clean up a submodule and its repository
 * @param {string} submoduleRepoDir - The submodule repository directory to remove
 */
export async function cleanupSubmodule(submoduleRepoDir) {
  await fse.remove(submoduleRepoDir).catch(() => {});
}

export function condit(name, condition, mochafn) {
  if (condition()) {
    return it(name, mochafn);
  }
  return it.skip(`${name} (${condition.description || 'condition not met'})`, mochafn);
}

condit.hasenv = (name) => {
  const fn = function env() {
    return !!process.env[name];
  };
  fn.description = `env var ${name} must be set`;
  return fn;
};

condit.hasenvs = (names) => {
  const fn = function envs() {
    return names.reduce((p, c) => p && !!process.env[c], true);
  };

  fn.description = `env vars ${names.join(', ')} must be set`;
  return fn;
};
