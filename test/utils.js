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
import { fetch } from '../src/fetch-utils.js';

/**
 * init git in integration so that helix-simulator can run
 */
export function initGit(dir, remote, branch) {
  const pwd = shell.pwd();
  shell.cd(dir);
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
  shell.cd(pwd);
}

export function switchBranch(dir, branch) {
  const pwd = shell.pwd();
  shell.cd(dir);
  shell.exec(`git checkout -b ${branch}`);
  shell.cd(pwd);
  console.log(`switched to branch ${branch} in ${dir}`);
}

export function clearHelixEnv() {
  const deleted = {};
  Object.keys(process.env).filter((key) => key.startsWith('HLX_')).forEach((key) => {
    deleted[key] = process.env[key];
    delete process.env[key];
  });
  return deleted;
}

export async function assertHttp(url, status, spec, replacements = []) {
  const resp = await fetch(url, {
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
