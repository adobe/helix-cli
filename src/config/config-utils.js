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
const { GitUrl, GitUtils } = require('@adobe/helix-shared');

const DEFAULT_CONFIG = path.resolve(__dirname, 'default-config.yaml');

class ConfigUtils {
  /**
   * Returns a new default config
   * @param {String} dir The working directory to use (optional)
   */
  static async createDefaultConfig(dir) {
    const source = await fs.readFile(DEFAULT_CONFIG, 'utf8');
    const origin = new GitUrl(GitUtils.getOrigin(dir) || 'http://localhost/local/default.git');
    return source.replace(/"\$CURRENT_ORIGIN"/g, `"${origin.toString()}"`);
  }
}

module.exports = ConfigUtils;
