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
import git from 'isomorphic-git';

/** Ref pointing at the last commit whose tree was fully synced to da.live. */
export const DA_SYNCED_REF = 'refs/da/synced';

/**
 * OID of the last da.live sync. Uses refs/da/synced when present; otherwise infers
 * from commit history (newest `push:` then `clone:`) so repos created before the ref
 * existed still compare against the correct baseline.
 * @param {import('isomorphic-git').FsClient} fs
 * @param {string} dir
 * @returns {Promise<string>}
 */
export async function resolveSyncedOid(fs, dir) {
  try {
    return await git.resolveRef({ fs, dir, ref: DA_SYNCED_REF });
  } catch (err) {
    if (err && (err.code === 'NotFoundError' || err.name === 'NotFoundError')) {
      const commits = await git.log({ fs, dir, depth: 500 });
      for (const c of commits) {
        if (String(c.commit.message).startsWith('push:')) {
          return c.oid;
        }
      }
      for (const c of commits) {
        if (String(c.commit.message).startsWith('clone:')) {
          return c.oid;
        }
      }
      return git.resolveRef({ fs, dir, ref: 'HEAD' });
    }
    throw err;
  }
}

/**
 * @param {import('isomorphic-git').FsClient} fs
 * @param {string} dir
 * @param {string} oid
 * @returns {Promise<void>}
 */
export async function writeSyncedRef(fs, dir, oid) {
  await git.writeRef({
    fs,
    dir,
    ref: DA_SYNCED_REF,
    value: oid,
    force: true,
  });
}

/**
 * True when the index or working tree differs from HEAD (uncommitted work).
 * @param {Array<[string, number, number, number]>} matrix
 * @returns {boolean}
 */
export function statusMatrixHasUncommitted(matrix) {
  return matrix.some(([, h, w, s]) => !(h === 1 && w === 1 && s === 1));
}

/**
 * Diff trees at two commits: paths as da.live paths (`/file`).
 * @param {import('isomorphic-git').FsClient} fs
 * @param {string} dir
 * @param {string} baseOid
 * @param {string} headOid
 * @returns {Promise<{ added: string[], modified: string[], deleted: string[] }>}
 */
export async function diffCommitTrees(fs, dir, baseOid, headOid) {
  if (baseOid === headOid) {
    return { added: [], modified: [], deleted: [] };
  }

  const baseFiles = new Set(await git.listFiles({ fs, dir, ref: baseOid }));
  const headFiles = new Set(await git.listFiles({ fs, dir, ref: headOid }));

  const added = [];
  const modified = [];
  const deleted = [];

  for (const f of headFiles) {
    if (!baseFiles.has(f)) {
      added.push(`/${f}`);
    } else {
      // eslint-disable-next-line no-await-in-loop
      const b1 = await git.readBlob({
        fs,
        dir,
        oid: baseOid,
        filepath: f,
      });
      // eslint-disable-next-line no-await-in-loop
      const b2 = await git.readBlob({
        fs,
        dir,
        oid: headOid,
        filepath: f,
      });
      if (b1.oid !== b2.oid) {
        modified.push(`/${f}`);
      }
    }
  }

  for (const f of baseFiles) {
    if (!headFiles.has(f)) {
      deleted.push(`/${f}`);
    }
  }

  return { added, modified, deleted };
}

/**
 * Number of commits reachable from `tipOid` before hitting `ancestorOid` (exclusive).
 * @param {import('isomorphic-git').FsClient} fs
 * @param {string} dir
 * @param {string} tipOid
 * @param {string} ancestorOid
 * @returns {Promise<number>}
 */
export async function countCommitsAhead(fs, dir, tipOid, ancestorOid) {
  if (tipOid === ancestorOid) {
    return 0;
  }
  const commits = await git.log({
    fs,
    dir,
    ref: tipOid,
    depth: 5000,
  });
  let n = 0;
  for (const c of commits) {
    if (c.oid === ancestorOid) {
      return n;
    }
    n += 1;
  }
  return n;
}

/**
 * Committer time in ms for conflict checks (da.live lastModified).
 * @param {import('isomorphic-git').FsClient} fs
 * @param {string} dir
 * @param {string} commitOid
 * @returns {Promise<number>}
 */
export async function getCommitCommitterTimeMs(fs, dir, commitOid) {
  const { commit } = await git.readCommit({ fs, dir, oid: commitOid });
  return commit.committer.timestamp * 1000;
}
