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
 * @param {string} dir - Directory to initialize git in
 * @param {string} remote - Optional remote URL
 * @param {string} branch - Optional branch to create
 */
export function initGit(dir, remote, branch) {
  // Ensure directory exists before trying to cd into it
  if (!fse.existsSync(dir)) {
    throw new Error(`Directory ${dir} does not exist. Please ensure it's created before calling initGit.`);
  }

  const pwd = shell.pwd();
  try {
    shell.cd(dir);
    shell.exec('git init');
    shell.exec('git checkout -b master');

    // Check if there are files to add before committing
    const statusResult = shell.exec('git status --porcelain', { silent: true });
    if (statusResult.stdout.trim()) {
      shell.exec('git add -A');
      shell.exec('git commit -m"initial commit."');
    }

    if (remote) {
      shell.exec(`git remote add origin ${remote}`);
    }
    if (branch) {
      shell.exec(`git checkout -b ${branch}`);
    }
  } finally {
    shell.cd(pwd);
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
 * Initialize a git repository with proper error handling and directory validation
 * @param {string} dir - Directory to initialize git in (must exist)
 * @param {Object} options - Configuration options
 * @param {string} options.remote - Optional remote URL
 * @param {string} options.branch - Optional branch to create after master
 * @param {boolean} options.addFiles - Whether to add and commit existing files (default: true)
 * @param {string} options.commitMessage - Custom commit message (default: "initial commit.")
 * @returns {void}
 */
export function initGitRepo(dir, options = {}) {
  const {
    remote,
    branch,
    addFiles = true,
    commitMessage = 'initial commit.',
  } = options;

  // Ensure directory exists
  if (!fse.existsSync(dir)) {
    throw new Error(`Directory ${dir} does not exist`);
  }

  const pwd = shell.pwd();
  try {
    shell.cd(dir);
    shell.exec('git init', { silent: false });
    shell.exec('git checkout -b master', { silent: false });

    if (addFiles) {
      // Check if there are files to add
      const result = shell.exec('git status --porcelain', { silent: true });
      if (result.stdout.trim()) {
        shell.exec('git add -A', { silent: false });
        shell.exec(`git commit -m "${commitMessage}"`, { silent: false });
      }
    }

    if (remote) {
      shell.exec(`git remote add origin ${remote}`, { silent: false });
    }

    if (branch) {
      shell.exec(`git checkout -b ${branch}`, { silent: false });
    }
  } finally {
    shell.cd(pwd);
  }
}

/**
 * Create a git worktree with proper setup and cleanup handling
 * @param {string} parentDir - Parent repository directory
 * @param {string} worktreeDir - Directory for the worktree
 * @param {string} branchName - Branch name for the worktree
 * @returns {Object} Worktree info with cleanup function
 */
export function createGitWorktree(parentDir, worktreeDir, branchName) {
  if (!fse.existsSync(parentDir)) {
    throw new Error(`Parent directory ${parentDir} does not exist`);
  }

  const pwd = shell.pwd();

  try {
    shell.cd(parentDir);

    // Ensure parent is a git repository
    const gitCheck = shell.exec('git rev-parse --git-dir', { silent: true });
    if (gitCheck.code !== 0) {
      throw new Error(`${parentDir} is not a git repository`);
    }

    // Create worktree with unique branch name to avoid conflicts
    const uniqueBranch = `${branchName}-${Date.now()}`;
    const result = shell.exec(`git worktree add "${worktreeDir}" -b ${uniqueBranch}`, { silent: false });

    if (result.code !== 0) {
      throw new Error(`Failed to create worktree: ${result.stderr}`);
    }

    return {
      worktreeDir,
      branchName: uniqueBranch,
      cleanup: async () => {
        const currentPwd = shell.pwd();
        try {
          shell.cd(parentDir);
          shell.exec(`git worktree remove "${worktreeDir}" --force`, { silent: true });
        } catch (e) {
          // Ignore cleanup errors
        } finally {
          shell.cd(currentPwd);
          await fse.remove(worktreeDir).catch(() => {});
        }
      },
    };
  } finally {
    shell.cd(pwd);
  }
}

/**
 * Create a git submodule setup for testing
 * @param {string} parentDir - Parent repository directory
 * @param {string} submodulePath - Relative path for the submodule
 * @param {string} submoduleRepo - Repository URL for the submodule
 * @returns {Object} Submodule info with cleanup function
 */
export function createGitSubmodule(parentDir, submodulePath, submoduleRepo) {
  if (!fse.existsSync(parentDir)) {
    throw new Error(`Parent directory ${parentDir} does not exist`);
  }

  const pwd = shell.pwd();
  const absoluteSubmodulePath = path.join(parentDir, submodulePath);

  try {
    shell.cd(parentDir);

    // Ensure parent is a git repository
    const gitCheck = shell.exec('git rev-parse --git-dir', { silent: true });
    if (gitCheck.code !== 0) {
      throw new Error(`${parentDir} is not a git repository`);
    }

    // Add submodule
    const result = shell.exec(`git submodule add ${submoduleRepo} ${submodulePath}`, { silent: false });

    if (result.code !== 0) {
      throw new Error(`Failed to create submodule: ${result.stderr}`);
    }

    return {
      submodulePath: absoluteSubmodulePath,
      cleanup: async () => {
        const currentPwd = shell.pwd();
        try {
          shell.cd(parentDir);
          // Remove submodule properly
          shell.exec(`git submodule deinit -f ${submodulePath}`, { silent: true });
          shell.exec(`git rm -f ${submodulePath}`, { silent: true });
          await fse.remove(path.join(parentDir, '.git', 'modules', submodulePath)).catch(() => {});
        } catch (e) {
          // Ignore cleanup errors
        } finally {
          shell.cd(currentPwd);
        }
      },
    };
  } finally {
    shell.cd(pwd);
  }
}

/**
 * Simulate a git submodule by creating a .git file (for testing submodule detection)
 * @param {string} dir - Directory to simulate as a submodule
 * @param {string} gitPath - Relative path to put in .git file
 */
export function simulateGitSubmodule(dir, gitPath = '../.git/modules/my-submodule') {
  if (!fse.existsSync(dir)) {
    throw new Error(`Directory ${dir} does not exist`);
  }

  // Remove existing .git directory if it exists
  const gitDir = path.join(dir, '.git');
  if (fse.existsSync(gitDir)) {
    fse.removeSync(gitDir);
  }

  // Create .git file pointing to parent's git directory
  fse.writeFileSync(gitDir, `gitdir: ${gitPath}\n`);
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
