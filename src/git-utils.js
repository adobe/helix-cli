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
import fs from 'fs';
import path from 'path';
import os from 'os';
import ignore from 'ignore';
import ini from 'ini';
import fse from 'fs-extra';
import { GitUrl } from '@adobe/helix-shared-git';

import git from 'isomorphic-git';
// cache for isomorphic-git API
// see https://isomorphic-git.org/docs/en/cache
const cache = {};

export default class GitUtils {
  static DEFAULT_BRANCH = 'main';

  /**
   * Determines whether the working tree directory contains uncommitted or unstaged changes.
   *
   * @param {string} dir working tree directory path of the git repo
   * @param {string} [homedir] optional users home directory
   * @returns {Promise<boolean>} `true` if there are uncommitted/unstaged changes; otherwise `false`
   */
  static async isDirty(dir, homedir = os.homedir()) {
    // see https://isomorphic-git.org/docs/en/statusMatrix
    const HEAD = 1;
    const WORKDIR = 2;
    const STAGE = 3;
    const matrix = await git.statusMatrix({ fs, dir, cache });
    let modified = matrix
      .filter((row) => !(row[HEAD] === row[WORKDIR] && row[WORKDIR] === row[STAGE]));
    if (modified.length === 0) {
      return false;
    }

    // ignore submodules
    // see https://github.com/adobe/helix-cli/issues/614
    const gitModules = path.resolve(dir, '.gitmodules');
    if (await fse.pathExists(gitModules)) {
      const modules = ini.parse(await fse.readFile(gitModules, 'utf-8'));
      Object.keys(modules).forEach((key) => {
        const module = modules[key];
        if (module.path) {
          modified = modified.filter((row) => !row[0].startsWith(module.path));
        }
      });
      if (modified.length === 0) {
        return false;
      }
    }

    // workaround for https://github.com/isomorphic-git/isomorphic-git/issues/1076
    // TODO: remove once #1076 has been resolved.
    let ign;
    const localeIgnore = path.resolve(dir, '.gitignore');
    if (await fse.pathExists(localeIgnore)) {
      ign = ignore();
      ign.add(await fse.readFile(localeIgnore, 'utf-8'));
    }

    // need to re-check the modified against the globally ignored
    // see: https://github.com/isomorphic-git/isomorphic-git/issues/444
    const globalConfig = path.resolve(homedir, '.gitconfig');
    const config = ini.parse(await fse.readFile(globalConfig, 'utf-8'));
    const globalIgnore = path.resolve(homedir, (config.core && config.core.excludesfile) || '.gitignore_global');
    if (await fse.pathExists(globalIgnore)) {
      ign = ign || ignore();
      ign.add(await fse.readFile(globalIgnore, 'utf-8'));
    }

    if (ign) {
      modified = modified.filter((row) => !ign.ignores(row[0]));
      if (modified.length === 0) {
        return false;
      }
    }

    // filter out the deleted ones for the checks below
    const existing = modified.filter((row) => row[WORKDIR] > 0).map((row) => row[0]);
    if (existing.length < modified.length) {
      return true;
    }

    // we also need to filter out the non-files and non-symlinks.
    // see: https://github.com/isomorphic-git/isomorphic-git/issues/705
    const stats = await Promise.all(existing.map((file) => fse.lstat(path.resolve(dir, file))));
    const files = stats.filter((stat) => stat.isFile() || stat.isSymbolicLink());
    return files.length > 0;
  }

  /**
   * Checks if the given file is missing or ignored by git.
   *
   * @param {string} dir working tree directory path of the git repo
   * @param {string} filepath file to check
   * @param {string} [homedir] optional users home directory
   * @returns {Promise<boolean>} `true` if the file is ignored.
   */
  static async isIgnored(dir, filepath, homedir = os.homedir()) {
    if (!(await fse.pathExists(path.resolve(dir, filepath)))) {
      return true;
    }
    if (!(await fse.pathExists(path.resolve(dir, '.git')))) {
      return true;
    }

    const status = await git.status({
      fs, dir, filepath, cache,
    });
    if (status === 'ignored') {
      return true;
    }

    // need to re-check the modified against the globally ignored
    // see: https://github.com/isomorphic-git/isomorphic-git/issues/444
    const globalConfig = path.resolve(homedir, '.gitconfig');
    const config = ini.parse(await fse.readFile(globalConfig, 'utf-8'));
    const globalIgnore = path.resolve(homedir, (config.core && config.core.excludesfile) || '.gitignore_global');
    if (await fse.pathExists(globalIgnore)) {
      const ign = ignore().add(await fse.readFile(globalIgnore, 'utf-8'));
      return ign.ignores(filepath);
    }

    return false;
  }

  /**
   * Checks if a name is valid for use in a DNS subdomain.
   * DNS labels must:
   * - Be between 1 and 63 characters long
   * - Contain only alphanumeric characters and hyphens
   * - Not start or end with a hyphen
   * - Not contain dots or other special characters
   * @param {string} name the name to validate
   * @returns {boolean} true if valid for DNS
   */
  static isValidDNSName(name) {
    // Check length (DNS labels must be 1-63 characters)
    if (!name || name.length > 63) {
      return false;
    }

    // DNS labels can only contain alphanumeric characters and hyphens
    // They cannot start or end with hyphens
    // They cannot contain dots or other special characters
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(name);
  }

  /**
   * Returns the name of the current branch. If `HEAD` is at a tag, the name of the tag
   * will be returned instead, if head is at a commit, fallback will be returned.
   *
   * @param {string} dir working tree directory path of the git repo
   * @param {string} fallback fallback value if no branch or tag is found
   * @returns {Promise<string>} current branch or tag
   */
  static async getBranch(dir, fallback = this.DEFAULT_BRANCH) {
    // For worktrees, we need to get the actual git directory
    const gitDir = await this.getGitDirectory(dir);

    // If it's a worktree, try to get the branch from the worktree HEAD file
    if (await this.isGitWorktree(dir)) {
      try {
        // Read the HEAD file in the worktree's git directory
        const headPath = path.join(gitDir, 'HEAD');
        const headContent = await fse.readFile(headPath, 'utf-8');
        const match = headContent.match(/^ref: refs\/heads\/(.+)$/m);
        if (match) {
          return match[1].trim();
        }
      } catch (e) {
        // Fall through to regular processing
      }
    }

    // current commit sha
    const rev = await git.resolveRef({ fs, dir, ref: 'HEAD' });
    // reverse-lookup tag from commit sha
    const allTags = await git.listTags({ fs, dir });

    // iterate sequentially over tags to avoid OOME
    for (const tag of allTags) {
      /* eslint-disable no-await-in-loop */
      const oid = await git.resolveRef({ fs, dir, ref: tag });
      const obj = await git.readObject({
        fs, dir, oid, cache,
      });
      const commitSha = obj.type === 'tag'
        ? await git.resolveRef({ fs, dir, ref: obj.object.object }) // annotated tag
        : oid; // lightweight tag
      if (commitSha === rev) {
        // Only return tags that are valid for DNS names
        // Skip tags containing dots or other invalid characters
        if (GitUtils.isValidDNSName(tag)) {
          return tag;
        }
      }
    }

    const currentBranch = await git.currentBranch({ fs, dir, fullname: false });
    if (currentBranch) {
      return currentBranch;
    }

    return fallback;
  }

  /**
   * Returns the encoded (any non word character replaced by `-`) `origin` remote url.
   * If no `origin` remote url is defined `local--<basename of current working dir>`
   * will be returned instead.
   *
   * @param {string} dir working tree directory path of the git repo
   * @returns {Promise<string>} `dirty` or encoded current branch/tag
   */
  static async getRepository(dir) {
    const repo = (await GitUtils.getOrigin(dir))
      .replace(/[\W]/g, '-');
    return repo !== '' ? repo : `local--${path.basename(dir)}`;
  }

  /**
   * Returns the `origin` remote url or `''` if none is defined.
   *
   * @param {string} dir working tree directory path of the git repo
   * @returns {Promise<string>} `origin` remote url
   */
  static async getOrigin(dir) {
    try {
      // For worktrees, we need to use the main repository's config
      let gitDir = dir;
      if (await this.isGitWorktree(dir)) {
        // Get the worktree's git directory
        const worktreeGitDir = await this.getGitDirectory(dir);
        // Extract the main repository path from the worktree git dir
        // Worktree git dirs are like: /path/to/repo/.git/worktrees/worktree-name
        const match = worktreeGitDir.match(/^(.+?)\/\.git\/worktrees\//);
        if (match) {
          [, gitDir] = match;
        }
      }

      const rmt = (await git.listRemotes({ fs, dir: gitDir })).find((entry) => entry.remote === 'origin');
      return typeof rmt === 'object' ? rmt.url : '';
    } catch (e) {
      // don't fail if directory is not a git repository
      return '';
    }
  }

  /**
   * Same as #getOrigin() but returns a `GitUrl` instance instead of a string.
   *
   * @param {string} dir working tree directory path of the git repo
   * @returns {Promise<GitUrl>} `origin` remote url ot {@code null} if not available
   * @param {GitUrl~JSON} defaults Defaults for creating the git url.
   */
  static async getOriginURL(dir, defaults) {
    const origin = await GitUtils.getOrigin(dir);
    return origin ? new GitUrl(origin, defaults) : null;
  }

  /**
   * Returns the sha of the current (i.e. `HEAD`) commit.
   *
   * @param {string} dir working tree directory path of the git repo
   * @returns {Promise<string>} sha of the current (i.e. `HEAD`) commit
   */
  static async getCurrentRevision(dir) {
    return git.resolveRef({ fs, dir, ref: 'HEAD' });
  }

  /**
   * Returns the commit oid of the curent commit referenced by `ref`
   *
   * @param {string} dir git repo path
   * @param {string} ref reference (branch, tag or commit sha)
   * @returns {Promise<string>} commit oid of the curent commit referenced by `ref`
   * @throws {Errors.NotFoundError}: resource not found
   */
  static async resolveCommit(dir, ref) {
    return git.resolveRef({ fs, dir, ref })
      .catch(async (err) => {
        if (err instanceof git.Errors.NotFoundError) {
          // fallback: is ref a shortened oid prefix?
          const oid = await git.expandOid({
            fs, dir, oid: ref, cache,
          })
            .catch(() => { throw err; });
          return git.resolveRef({ fs, dir, ref: oid });
        }
        // re-throw
        throw err;
      });
  }

  /**
   * Returns the contents of the file at revision `ref` and `pathName`
   *
   * @param {string} dir git repo path
   * @param {string} ref reference (branch, tag or commit sha)
   * @param {string} filePath relative path to file
   * @returns {Promise<Buffer>} content of specified file
   * @throws {Errors.NotFoundError}: resource not found or invalid reference
   */
  static async getRawContent(dir, ref, pathName) {
    return GitUtils.resolveCommit(dir, ref)
      .then((oid) => git.readObject({
        fs, dir, oid, filepath: pathName, format: 'content', cache,
      }))
      .then((obj) => obj.object);
  }

  /**
   * Checks if the given directory is a git worktree.
   *
   * @param {string} dir working tree directory path
   * @returns {Promise<boolean>} `true` if the directory is a git worktree
   */
  static async isGitWorktree(dir) {
    const gitPath = path.resolve(dir, '.git');
    try {
      // Read the file directly - if it's not a file, readFile will throw
      const content = await fse.readFile(gitPath, 'utf-8');
      return content.includes('/worktrees/');
    } catch (e) {
      // Either doesn't exist, is a directory, or can't be read
      // ignore
    }
    return false;
  }

  /**
   * Checks if the given directory is a git submodule.
   *
   * @param {string} dir working tree directory path
   * @returns {Promise<boolean>} `true` if the directory is a git submodule
   */
  static async isGitSubmodule(dir) {
    const gitPath = path.resolve(dir, '.git');
    try {
      // Read the file directly - if it's not a file, readFile will throw
      const content = await fse.readFile(gitPath, 'utf-8');
      // Submodules have relative paths to .git/modules
      return content.includes('/.git/modules/') || content.includes('\\.git\\modules\\');
    } catch (e) {
      // Either doesn't exist, is a directory, or can't be read
      // ignore
    }
    return false;
  }

  /**
   * Gets the actual git directory, resolving through worktree/submodule redirection.
   *
   * @param {string} dir working tree directory path
   * @returns {Promise<string>} path to the actual git directory
   */
  static async getGitDirectory(dir) {
    const gitPath = path.resolve(dir, '.git');
    try {
      // Try to read as a file first (worktree/submodule case)
      const content = await fse.readFile(gitPath, 'utf-8');
      const match = content.match(/^gitdir: (.+)$/m);
      if (match) {
        const targetPath = match[1].trim();
        // If it's a relative path, resolve it relative to the directory
        if (!path.isAbsolute(targetPath)) {
          return path.resolve(dir, targetPath);
        }
        return targetPath;
      }
    } catch (e) {
      // If readFile fails, it's likely a directory - check if it exists
      try {
        const stat = await fse.lstat(gitPath);
        if (stat.isDirectory()) {
          return gitPath;
        }
      } catch (statErr) {
        // ignore
      }
    }
    return gitPath;
  }

  /**
   * Generates a deterministic port number based on branch name.
   *
   * @param {string} branchName the branch name to hash
   * @param {number} basePort base port number (default: 3000)
   * @param {number} range range of ports to use (default: 1000)
   * @returns {number} port number between basePort and basePort + range - 1
   */
  static hashBranchToPort(branchName, basePort = 3000, range = 1000) {
    let hash = 0;
    for (let i = 0; i < branchName.length; i += 1) {
      // eslint-disable-next-line no-bitwise
      hash = ((hash << 5) - hash) + branchName.charCodeAt(i);
      // eslint-disable-next-line no-bitwise
      hash &= hash; // Convert to 32bit integer
    }
    return basePort + (Math.abs(hash) % range);
  }
}
