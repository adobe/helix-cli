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
import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import git from 'isomorphic-git';
import esmock from 'esmock';
import { createTestRoot, Nock } from '../utils.js';
import { CONFIG_FILE, CONTENT_DIR } from '../../src/content/content-shared.js';
import { DA_SYNCED_REF } from '../../src/content/content-git.js';
import { makeLogger, setupContentDir } from './content-test-utils.js';

// Two arbitrary backends: the mechanism is generic, any two admin hosts behave the same way.
const HOST_A = 'https://admin-a.example.com';
const HOST_B = 'https://admin-b.example.com';

const ORG = 'myorg';
const SITE = 'mysite';

/** Files the fake backend A serves. */
const REMOTE_FILES = {
  '/index.html': '<html><p>index from A</p></html>',
  '/blog/post.html': '<html><p>post from A</p></html>',
};

async function makeCloneCommand(testRoot) {
  const mod = await esmock('../../src/content/clone.cmd.js', {
    '../../src/content/da-auth.js': { getValidToken: async () => 'mock-token' },
  });
  const Cmd = mod.default;
  const log = makeLogger();
  return {
    log,
    cmd: new Cmd(log)
      .withDirectory(testRoot)
      .withOrg(ORG)
      .withSite(SITE)
      .withRootPath('/'),
  };
}

async function makePushCommand(testRoot) {
  const mod = await esmock('../../src/content/push.cmd.js', {
    '../../src/content/da-auth.js': { getValidToken: async () => 'mock-token' },
  });
  const Cmd = mod.default;
  const log = makeLogger();
  return { log, cmd: new Cmd(log).withDirectory(testRoot) };
}

/** Replies to the list and source requests a full clone of {@link REMOTE_FILES} makes. */
function nockClone(nock, host) {
  nock(host)
    .get(`/list/${ORG}/${SITE}/`)
    .reply(200, [
      { path: `/${ORG}/${SITE}/index.html`, name: 'index.html', ext: 'html' },
      { path: `/${ORG}/${SITE}/blog`, name: 'blog' },
    ])
    .get(`/list/${ORG}/${SITE}/blog`)
    .reply(200, [
      { path: `/${ORG}/${SITE}/blog/post.html`, name: 'post.html', ext: 'html' },
    ]);
  for (const [daPath, body] of Object.entries(REMOTE_FILES)) {
    nock(host)
      .get(`/source/${ORG}/${SITE}${daPath}`)
      .reply(200, body, { 'content-type': 'text/html' });
  }
}

describe('cross-backend content copy', () => {
  let testRoot;
  let nock;
  let savedAdmin;

  beforeEach(async () => {
    testRoot = await createTestRoot();
    nock = new Nock();
    savedAdmin = process.env.AEM_DA_ADMIN;
  });

  afterEach(async () => {
    if (savedAdmin === undefined) {
      delete process.env.AEM_DA_ADMIN;
    } else {
      process.env.AEM_DA_ADMIN = savedAdmin;
    }
    process.exitCode = 0;
    nock.done();
    await fse.remove(testRoot);
  });

  /** Clones from HOST_A and returns the content dir. */
  async function cloneFromHostA() {
    process.env.AEM_DA_ADMIN = HOST_A;
    nockClone(nock, HOST_A);
    const { cmd } = await makeCloneCommand(testRoot);
    await cmd.run();
    return path.resolve(testRoot, CONTENT_DIR);
  }

  it('clone records the admin host it cloned from', async () => {
    const contentDir = await cloneFromHostA();
    const config = await fse.readJson(path.join(contentDir, CONFIG_FILE));
    assert.strictEqual(config.daAdmin, HOST_A);
    assert.strictEqual(config.org, ORG);
    assert.strictEqual(config.site, SITE);
  });

  it('refuses a push to a different backend without --force', async () => {
    await cloneFromHostA();

    process.env.AEM_DA_ADMIN = HOST_B;
    const { log, cmd } = await makePushCommand(testRoot);
    await cmd.run();

    assert.ok(log.logs.some((l) => l.msg.includes(
      'pushing to a different backend than cloned from; use --force to copy',
    )));
    assert.strictEqual(process.exitCode, 1);
  });

  it('copies every file to the other backend with --force', async () => {
    const contentDir = await cloneFromHostA();
    const syncedBefore = await git.resolveRef({ fs, dir: contentDir, ref: DA_SYNCED_REF });

    const puts = [];
    nock(HOST_B)
      .put(`/source/${ORG}/${SITE}/index.html`)
      .reply((uri, body) => {
        puts.push({ uri, body });
        return [200, {}];
      })
      .put(`/source/${ORG}/${SITE}/blog/post.html`)
      .reply((uri, body) => {
        puts.push({ uri, body });
        return [200, {}];
      });

    process.env.AEM_DA_ADMIN = HOST_B;
    const { log, cmd } = await makePushCommand(testRoot);
    await cmd.withForce(true).run();

    assert.deepStrictEqual(
      puts.map((p) => p.uri).sort(),
      [`/source/${ORG}/${SITE}/blog/post.html`, `/source/${ORG}/${SITE}/index.html`],
    );
    assert.ok(log.logs.some((l) => l.msg.includes('skipping the conflict check')));
    assert.ok(log.logs.some((l) => l.msg.includes('2 added, 0 modified, 0 deleted')));

    // the baseline still describes the backend the content came from
    const syncedAfter = await git.resolveRef({ fs, dir: contentDir, ref: DA_SYNCED_REF });
    assert.strictEqual(syncedAfter, syncedBefore);
    const config = await fse.readJson(path.join(contentDir, CONFIG_FILE));
    assert.strictEqual(config.daAdmin, HOST_A);
  });

  it('never uploads the local .gitignore bookkeeping file', async () => {
    const contentDir = await cloneFromHostA();
    assert.ok(await fse.pathExists(path.join(contentDir, '.gitignore')));

    const puts = [];
    nock(HOST_B)
      .put(`/source/${ORG}/${SITE}/index.html`)
      .reply((uri) => {
        puts.push(uri);
        return [200, {}];
      })
      .put(`/source/${ORG}/${SITE}/blog/post.html`)
      .reply((uri) => {
        puts.push(uri);
        return [200, {}];
      });

    process.env.AEM_DA_ADMIN = HOST_B;
    const { cmd } = await makePushCommand(testRoot);
    await cmd.withForce(true).run();

    assert.ok(!puts.some((uri) => uri.endsWith('/.gitignore')));
  });

  it('a dry run against a different backend lists the whole copy and uploads nothing', async () => {
    await cloneFromHostA();

    process.env.AEM_DA_ADMIN = HOST_B;
    const { log, cmd } = await makePushCommand(testRoot);
    await cmd.withForce(true).withDryRun(true).run();

    assert.ok(log.logs.some((l) => l.msg.includes('Dry run')));
    assert.ok(log.logs.some((l) => l.msg.includes('+ /index.html')));
    assert.ok(log.logs.some((l) => l.msg.includes('+ /blog/post.html')));
  });

  it('keeps the normal conflict check for a push to the same backend', async () => {
    const contentDir = await cloneFromHostA();

    await fse.writeFile(path.join(contentDir, 'index.html'), '<html><p>edited locally</p></html>');
    await git.add({ fs, dir: contentDir, filepath: 'index.html' });
    await git.commit({
      fs,
      dir: contentDir,
      message: 'edit index',
      author: { name: 'aem-cli', email: 'aem-cli@adobe.com' },
    });

    // the remote moved after the clone: the same-backend path must still detect the conflict
    nock(HOST_A)
      .head(`/source/${ORG}/${SITE}/index.html`)
      .reply(200, '', { 'last-modified': new Date(Date.now() + 60000).toUTCString() });

    process.env.AEM_DA_ADMIN = HOST_A;
    const { log, cmd } = await makePushCommand(testRoot);
    await cmd.run();

    assert.ok(log.logs.some((l) => l.msg.includes('Conflicts detected')));
    assert.ok(log.logs.some((l) => l.msg.includes('Use --force to overwrite remote changes')));
    assert.strictEqual(process.exitCode, 1);
  });

  it('treats a config without a recorded host as the same backend', async () => {
    // content cloned before the host was recorded must keep the old sync behavior
    const contentDir = await setupContentDir(testRoot, ORG, SITE);
    await fse.writeJson(path.join(contentDir, CONFIG_FILE), { org: ORG, site: SITE, daAdmin: '  ' });

    await fse.writeFile(path.join(contentDir, 'index.html'), '<html><p>edited</p></html>');
    await git.add({ fs, dir: contentDir, filepath: 'index.html' });
    await git.commit({
      fs,
      dir: contentDir,
      message: 'edit index',
      author: { name: 'aem-cli', email: 'aem-cli@adobe.com' },
    });

    const puts = [];
    nock(HOST_B)
      .head(`/source/${ORG}/${SITE}/index.html`)
      .reply(404)
      .put(`/source/${ORG}/${SITE}/index.html`)
      .reply((uri) => {
        puts.push(uri);
        return [200, {}];
      });

    process.env.AEM_DA_ADMIN = HOST_B;
    const { cmd } = await makePushCommand(testRoot);
    await cmd.run();

    assert.deepStrictEqual(puts, [`/source/${ORG}/${SITE}/index.html`]);
    assert.notStrictEqual(process.exitCode, 1);
  });

  it('pushes only the changed file to the same backend', async () => {
    const contentDir = await cloneFromHostA();

    await fse.writeFile(path.join(contentDir, 'index.html'), '<html><p>edited locally</p></html>');
    await git.add({ fs, dir: contentDir, filepath: 'index.html' });
    await git.commit({
      fs,
      dir: contentDir,
      message: 'edit index',
      author: { name: 'aem-cli', email: 'aem-cli@adobe.com' },
    });

    const puts = [];
    nock(HOST_A)
      .head(`/source/${ORG}/${SITE}/index.html`)
      .reply(404)
      .put(`/source/${ORG}/${SITE}/index.html`)
      .reply((uri) => {
        puts.push(uri);
        return [200, {}];
      });

    process.env.AEM_DA_ADMIN = HOST_A;
    const { cmd } = await makePushCommand(testRoot);
    await cmd.run();

    assert.deepStrictEqual(puts, [`/source/${ORG}/${SITE}/index.html`]);
  });
});
