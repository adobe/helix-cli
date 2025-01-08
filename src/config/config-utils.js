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
import chalk from 'chalk-template';
import fs from 'fs/promises';
import fse from 'fs-extra';
import os from 'os';
import path from 'path';
import semver from 'semver';
import { decodeJwt } from 'jose';
import GitUtils from '../git-utils.js';
import pkgJson from '../package.cjs';

/**
 * Checks if the .env file is ignored by git.
 * @param dir the current directory
 * @returns {Promise<void>}
 */
export async function validateDotEnv(dir = process.cwd()) {
  if (await GitUtils.isIgnored(dir, '.env')) {
    return true;
  }
  process.stdout.write(chalk`
{yellowBright Warning:} Your {cyan '.env'} file is currently not ignored by git. 
This is typically not good because it might contain secrets 
which should never be stored in the git repository.
`);
  return false;
}

const hlxFolder = '.hlx';
const tokenFileName = '.hlx-token';
const tokenFilePath = path.join(hlxFolder, tokenFileName);

/**
 * Writes the site token to the .hlx/.hlx-token file.
 * Checks if the .hlx file is ignored by git and adds it to the .gitignore file if necessary.
 *
 * @param {string} siteToken
 */
export async function saveSiteTokenToFile(siteToken) {
  if (!siteToken) {
    return;
  }

  /*
   don't allow writing arbitrary data to the file system.
   validate and write only valid site tokens to the file
  */
  if (siteToken.startsWith('hlxtst_')) {
    try {
      decodeJwt(siteToken.substring(7));
    } catch (e) {
      process.stdout.write(chalk`
{redBright Error:} The provided site token is not a valid JWT, it will not be written to your .hlx-token file.
`);
      return;
    }
  } else {
    process.stdout.write(chalk`
{redBright Error:} The provided site token is not a recognised token format, it will not be written to your .hlx-token file.
`);
    return;
  }

  await fs.mkdir(hlxFolder, { recursive: true });

  try {
    await fs.writeFile(tokenFilePath, JSON.stringify({ siteToken }, null, 2), 'utf8');
  } finally {
    if (!(await GitUtils.isIgnored(process.cwd(), tokenFilePath))) {
      await fs.appendFile('.gitignore', `${os.EOL}${tokenFileName}${os.EOL}`, 'utf8');
      process.stdout.write(chalk`
{redBright Warning:} Added your {cyan '.hlx-token'} file to .gitignore, because it now contains your token.
Please make sure the token is not stored in the git repository.
`);
    }
  }
}

export async function getSiteTokenFromFile() {
  if (!(await fse.pathExists(tokenFilePath))) {
    return null;
  }

  try {
    const tokenInfo = JSON.parse(await fs.readFile(tokenFilePath, 'utf8'));
    return tokenInfo.siteToken;
  } catch (e) {
    process.stdout.write(chalk`
{redBright Error:} The site token could not be read from the {cyan '.hlx-token'} file.
`);
    process.stdout.write(`${e.stack}\n`);
  }

  return null;
}

/**
 * Checks if the given version is supported.
 * @param version {string} current node version
 * @param stdout {WritableStream} to report the warninf
 */
export function checkNodeVersion(version = process.version, stdout = process.stdout) {
  const supported = pkgJson.engines.node;
  if (!semver.satisfies(version, supported)) {
    stdout.write(chalk`
{yellowBright Warning:} The current node version {cyan ${version}} does not satisfy 
the supported version range {cyan ${supported}}.
You might encounter unexpected errors.   

`);
  }
}
