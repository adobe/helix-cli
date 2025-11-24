/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import semver from 'semver';
import chalk from 'chalk-template';
import { getFetch } from './fetch-utils.js';

/**
 * Checks if a newer version of the package is available on npm.
 * @param {string} packageName - The npm package name to check
 * @param {string} currentVersion - The current version of the package
 * @param {object} logger - Logger instance for outputting messages
 * @returns {Promise<void>}
 */
export async function checkForUpdates(packageName, currentVersion, logger) {
  try {
    const fetch = getFetch();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`https://registry.npmjs.org/${packageName}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Silently fail if we can't check for updates
      return;
    }

    const data = await response.json();
    const latestVersion = data['dist-tags']?.latest;

    if (latestVersion && semver.gt(latestVersion, currentVersion)) {
      const boxWidth = 61;
      const updateMsg = `Update available! ${currentVersion} → ${latestVersion}`;
      const installMsg = `Run npm install -g ${packageName} to update`;

      const updatePadding = ' '.repeat(Math.max(0, boxWidth - updateMsg.length - 4));
      const installPadding = ' '.repeat(Math.max(0, boxWidth - installMsg.length - 4));

      logger.warn('');
      logger.warn(chalk`{yellow ╭─────────────────────────────────────────────────────────────╮}`);
      logger.warn(chalk`{yellow │                                                             │}`);
      logger.warn(chalk`{yellow │   ${updateMsg}${updatePadding} │}`);
      logger.warn(chalk`{yellow │   ${installMsg}${installPadding} │}`);
      logger.warn(chalk`{yellow │                                                             │}`);
      logger.warn(chalk`{yellow ╰─────────────────────────────────────────────────────────────╯}`);
      logger.warn('');
    }
  } catch (error) {
    // Silently fail - don't block the command if update check fails
    // Only log in debug mode if available
    if (logger.level === 'debug' || logger.level === 'silly') {
      logger.debug(`Update check failed: ${error.message}`);
    }
  }
}
