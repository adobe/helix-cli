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

export default [
  {
    ignores: ['vendor/**', 'node_modules/**', 'coverage/**', 'coverage-browser/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        Error: 'readonly',
        JSON: 'readonly',
        Array: 'readonly',
        String: 'readonly',
      },
    },
    rules: {
      // Allow console for browser debugging
      'no-console': 'off',
      // Allow var for ES5 compatibility
      'no-var': 'off',
      'vars-on-top': 'off',
      // Allow function expressions for ES5 compatibility
      'prefer-arrow-callback': 'off',
      'func-names': 'off',
      // Allow traditional function syntax
      'space-before-function-paren': ['error', 'never'],
      // Allow arguments object for ES5
      'prefer-rest-params': 'off',
      // Allow non-shorthand for ES5
      'object-shorthand': 'off',
      'prefer-destructuring': 'off',
      // Standard formatting
      'comma-dangle': ['error', 'always-multiline'],
      'eol-last': ['error', 'always'],
      indent: ['error', 2],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      // IIFE formatting
      'wrap-iife': ['error', 'inside'],
      // Allow empty catch blocks for error suppression
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        // Mocha globals for tests
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        // Node.js globals for build scripts
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'no-underscore-dangle': 'off',
      'no-console': 'off',
    },
  },
];
