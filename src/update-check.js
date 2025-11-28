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
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import semver from 'semver';
import chalk from 'chalk-template';
import { xdgCache } from 'xdg-basedir';
import { getFetch } from './fetch-utils.js';

/**
 * Gets the path to the update check cache file using XDG base directories.
 * @returns {string} Path to the cache file
 */
function getUpdateCheckCacheFile() {
  const cacheDir = xdgCache || path.join(os.homedir(), '.cache');
  return path.join(cacheDir, 'aem-cli', 'last-update-check');
}

/**
 * Checks if we should skip the update check based on the last check time.
 * @returns {Promise<boolean>} True if we should skip the check
 */
async function shouldSkipUpdateCheck() {
  try {
    const cacheFile = getUpdateCheckCacheFile();
    const stats = await fs.stat(cacheFile);
    const lastCheck = stats.mtime.getTime();
    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;

    return (now - lastCheck) < oneDayInMs;
  } catch (error) {
    // If file doesn't exist or any other error, we should check
    return false;
  }
}

/**
 * Updates the last update check timestamp.
 */
async function updateLastCheckTime() {
  try {
    const cacheFile = getUpdateCheckCacheFile();
    const cacheDir = path.dirname(cacheFile);

    // Ensure cache directory exists
    await fs.mkdir(cacheDir, { recursive: true });

    // Touch the file to update its mtime
    await fs.writeFile(cacheFile, Date.now().toString());
  } catch (error) {
    // Silently ignore errors - this is not critical
  }
}

/**
 * Checks if a newer version of the package is available on npm.
 * @param {string} packageName - The npm package name to check
 * @param {string} currentVersion - The current version of the package
 * @param {object} logger - Logger instance for outputting messages
 * @returns {Promise<void>}
 */
export async function checkForUpdates(packageName, currentVersion, logger) {
  try {
    // Check if we should skip the update check (rate limiting)
    if (await shouldSkipUpdateCheck()) {
      return;
    }

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

      // Use String.padEnd() instead of manual padding calculation
      const updatePadded = `   ${updateMsg}`.padEnd(boxWidth - 1);
      const installPadded = `   ${installMsg}`.padEnd(boxWidth - 1);

      logger.warn('');
      logger.warn(chalk`{yellow ╭─────────────────────────────────────────────────────────────╮}`);
      logger.warn(chalk`{yellow │                                                             │}`);
      logger.warn(chalk`{yellow │${updatePadded} │}`);
      logger.warn(chalk`{yellow │${installPadded} │}`);
      logger.warn(chalk`{yellow │                                                             │}`);
      logger.warn(chalk`{yellow ╰─────────────────────────────────────────────────────────────╯}`);
      logger.warn('');
    }

    // Update the last check time after a successful check
    await updateLastCheckTime();
  } catch (error) {
    // Silently fail - don't block the command if update check fails
    // Only log in debug mode if available
    if (logger.level === 'debug' || logger.level === 'silly') {
      logger.debug(`Update check failed: ${error.message}`);
    }
  }
}
