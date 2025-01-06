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
import fs from 'fs';
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

/**
 * Writes the site token to the .env file.
 * Checks if the .env file is ignored by git and adds it to the .gitignore file if necessary.
 *
 * @param {string} siteToken
 */
export async function writeSiteTokenToDotEnv(siteToken) {
  if (!siteToken) {
    return;
  }

  /*
   don't allow writing arbitrary data to the file system.
   validate and write only valid site tokens to the .env file
  */
  if (siteToken.startsWith('hlxtst_')) {
    try {
      decodeJwt(siteToken.substring(7));
    } catch (e) {
      process.stdout.write(chalk`
{redBright Error:} The provided site token is not a valid JWT, it will not be written to your .env file.
`);
      return;
    }
  } else {
    process.stdout.write(chalk`
{redBright Error:} The provided site token is not a recognised token format, it will not be written to your .env file.
`);
    return;
  }

  const envFile = fs.openSync('.env', 'a+');
  try {
    if (!(await validateDotEnv(process.cwd()))) {
      fs.appendFileSync('.gitignore', '\r\n.env\r\n', 'utf8');
      process.stdout.write(chalk`
{redBright Warning:} Added your {cyan '.env'} file to .gitignore, because it now contains your site token.
Please make sure the site token is not stored in the git repository.
`);
    }

    let env = fs.readFileSync(envFile, 'utf8');
    if (env.includes('AEM_SITE_TOKEN')) {
      env = env.replace(/AEM_SITE_TOKEN=.*/, `AEM_SITE_TOKEN=${siteToken}`);
    } else {
      env += `\r\nAEM_SITE_TOKEN=${siteToken}\r\n`;
    }

    fs.ftruncateSync(envFile);
    fs.writeFileSync(envFile, env, 'utf8');
  } finally {
    fs.closeSync(envFile);
  }
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
