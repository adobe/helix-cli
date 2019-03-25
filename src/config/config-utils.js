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
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { GitUrl } = require('@adobe/helix-shared');
const semver = require('semver');
const GitUtils = require('../git-utils');
const pkgJson = require('../../package.json');

const DEFAULT_CONFIG = path.resolve(__dirname, 'default-config.yaml');

class ConfigUtils {
  /**
   * Returns a new default config
   * @param {String} dir The working directory to use (optional)
   */
  static async createDefaultConfig(dir) {
    const source = await fs.readFile(DEFAULT_CONFIG, 'utf8');
    const origin = new GitUrl(await GitUtils.getOrigin(dir || process.cwd()) || 'http://localhost/local/default.git');
    return source.replace(/"\$CURRENT_ORIGIN"/g, `"${origin.toString()}"`);
  }

  /**
   * Checks if the .env file is ignored by git.
   * @param dir the current directory
   * @returns {Promise<void>}
   */
  static async validateDotEnv(dir = process.cwd()) {
    if (await GitUtils.isIgnored(dir, '.env')) {
      return;
    }
    process.stdout.write(`
${chalk.yellowBright('Warning:')} Your ${chalk.cyan('.env')} file is currently not ignored by git. 
This is typically not good because it might contain secrets 
which should never be stored in the git repository.

`);
  }

  /**
   * Checks if the given version is supported.
   * @param version {string} current node version
   * @param stdout {WritableStream} to report the warninf
   */
  static checkNodeVersion(version = process.version, stdout = process.stdout) {
    const supported = pkgJson.engines.node;
    if (!semver.satisfies(version, supported)) {
      stdout.write(`
${chalk.yellowBright('Warning:')} The current node version ${chalk.cyan(version)} does not satisfy 
the supported version range ${chalk.cyan(supported)}.
You might encounter unexpected errors.   

`);
    }
  }
}

module.exports = ConfigUtils;
