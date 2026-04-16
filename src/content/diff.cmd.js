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
import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import git from 'isomorphic-git';
import { createTwoFilesPatch } from 'diff';
import chalk from 'chalk-template';
import { DaClient } from './da-api.js';
import { getValidToken } from './da-auth.js';
import { CONTENT_DIR, CONFIG_FILE } from './content-shared.js';

function printPatch(patch) {
  for (const line of patch.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) {
      process.stdout.write(chalk`{bold ${line}}\n`);
    } else if (line.startsWith('@@')) {
      process.stdout.write(chalk`{cyan ${line}}\n`);
    } else if (line.startsWith('+')) {
      process.stdout.write(chalk`{green ${line}}\n`);
    } else if (line.startsWith('-')) {
      process.stdout.write(chalk`{red ${line}}\n`);
    } else {
      process.stdout.write(`${line}\n`);
    }
  }
}

export default class DiffCommand {
  constructor(logger) {
    this.log = logger;
    this._dir = process.cwd();
    this._filePath = null;
  }

  withDirectory(dir) {
    this._dir = dir;
    return this;
  }

  withToken(token) {
    this._token = token;
    return this;
  }

  withFilePath(filePath) {
    this._filePath = filePath || null;
    return this;
  }

  async run() {
    const { log } = this;
    const contentDir = path.resolve(this._dir, CONTENT_DIR);
    const configPath = path.join(contentDir, CONFIG_FILE);

    if (!await fse.pathExists(configPath)) {
      throw new Error('No config found. Run \'aem content clone\' first.');
    }
    const { org, repo } = await fse.readJson(configPath);

    const matrix = await git.statusMatrix({ fs, dir: contentDir });
    let changedPaths = matrix
      .filter(([, head, workdir]) => (head === 0 && workdir === 2)
        || (head === 1 && workdir === 2)
        || (head === 1 && workdir === 0))
      .map(([filepath]) => `/${filepath}`);

    if (this._filePath) {
      const needle = this._filePath.startsWith('/') ? this._filePath : `/${this._filePath}`;
      changedPaths = changedPaths.filter((p) => p === needle);
      if (changedPaths.length === 0) {
        log.info(`No local changes detected for ${needle}`);
        return;
      }
    }

    if (changedPaths.length === 0) {
      log.info('Nothing to diff. No local changes vs last commit.');
      return;
    }

    const token = await getValidToken(log, this._token, this._dir);
    const client = new DaClient(token);

    await Promise.all(changedPaths.map(async (daPath) => {
      const localPath = path.join(contentDir, ...daPath.split('/').filter(Boolean));

      const localBuffer = await fse.pathExists(localPath)
        ? await fse.readFile(localPath)
        : Buffer.from('');

      const remoteRes = await client.getSource(org, repo, daPath);

      const localText = localBuffer.toString('utf-8');
      const remoteText = remoteRes ? await remoteRes.text() : '';

      const patch = createTwoFilesPatch(
        `a${daPath}`,
        `b${daPath}`,
        remoteText,
        localText,
        '',
        '',
        { context: 3 },
      );

      if (!patch.includes('\n@@')) {
        return;
      }

      printPatch(patch);
    }));
  }
}
