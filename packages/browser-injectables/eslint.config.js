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
import { defineConfig, globalIgnores } from '@eslint/config-helpers';
import { recommended, source, test } from '@adobe/eslint-config-helix';

export default defineConfig([
  globalIgnores([
    'vendor/**',
    'node_modules/**',
    'coverage/**',
    'coverage-browser/**',
    'web-test-runner.config.js',
  ]),
  {
    extends: [recommended],
  },
  {
    files: ['src/**/*.js'],
    extends: [source],
    languageOptions: {
      globals: {
        // Browser globals needed for injected scripts
        window: 'readonly',
        document: 'readonly',
        WebSocket: 'readonly',
        location: 'readonly',
      },
    },
    rules: {
      // Allow console for browser debugging
      'no-console': 'off',
      // Allow var for ES5 compatibility in injected scripts
      'no-var': 'off',
      'vars-on-top': 'off',
      // Allow function expressions for ES5 compatibility
      'prefer-arrow-callback': 'off',
      'func-names': 'off',
      // Allow arguments object for ES5
      'prefer-rest-params': 'off',
      // Allow non-shorthand for ES5
      'object-shorthand': 'off',
      'prefer-destructuring': 'off',
    },
  },
  {
    files: ['test/**/*.js'],
    extends: [test],
    languageOptions: {
      globals: {
        // Browser globals for tests
        window: 'readonly',
        document: 'readonly',
        location: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.js'],
    extends: [source],
    rules: {
      // Allow __dirname in Node.js scripts
      'no-underscore-dangle': 'off',
      // Allow console in build scripts
      'no-console': 'off',
    },
  },
]);