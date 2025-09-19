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
import path from 'path';
import fse from 'fs-extra';
import ignore from 'ignore';

/**
 * HlxIgnore utility class for handling .hlxignore file patterns
 */
export default class HlxIgnore {
  /**
   * Creates a new HlxIgnore instance
   * @param {string} projectDir - The project directory path
   */
  constructor(projectDir) {
    this._projectDir = projectDir;
    this._ignoreFile = path.join(projectDir, '.hlxignore');
    this._ignore = null;
    this._loaded = false;
  }

  /**
   * Loads the .hlxignore file if it exists
   * @returns {Promise<boolean>} true if .hlxignore file was loaded
   */
  async load() {
    if (this._loaded) {
      return this._ignore !== null;
    }

    this._loaded = true;

    try {
      const exists = await fse.pathExists(this._ignoreFile);
      if (exists) {
        const content = await fse.readFile(this._ignoreFile, 'utf-8');
        this._ignore = ignore();
        this._ignore.add(content);
        return true;
      }
    } catch (e) {
      // If there's an error reading the file, we'll just not use ignore patterns
      this._ignore = null;
    }

    return false;
  }

  /**
   * Checks if a file path should be ignored according to .hlxignore patterns
   * @param {string} filePath - The file path relative to the project directory
   * @returns {Promise<boolean>} true if the file should be ignored
   */
  async isIgnored(filePath) {
    await this.load();

    if (!this._ignore) {
      return false;
    }

    // Make the path relative to the project directory
    const relativePath = path.relative(this._projectDir, filePath);

    // Check if the path is ignored
    return this._ignore.ignores(relativePath);
  }

  /**
   * Reload the .hlxignore file (useful for live-reload scenarios)
   */
  async reload() {
    this._loaded = false;
    this._ignore = null;
    await this.load();
  }
}
