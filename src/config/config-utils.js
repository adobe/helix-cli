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
import semver from 'semver';
import GitUtils from '../git-utils.js';
import pkgJson from '../package.cjs';

/**
 * Checks if the .env file is ignored by git.
 * @param dir the current directory
 * @returns {Promise<void>}
 */
export async function validateDotEnv(dir = process.cwd()) {
  if (await GitUtils.isIgnored(dir, '.env')) {
    return;
  }
  process.stdout.write(chalk`
{yellowBright Warning:} Your {cyan '.env'} file is currently not ignored by git. 
This is typically not good because it might contain secrets 
which should never be stored in the git repository.

`);
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
