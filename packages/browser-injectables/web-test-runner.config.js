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

import { defaultReporter } from '@web/test-runner';
import { junitReporter } from '@web/test-runner-junit-reporter';
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  nodeResolve: true,
  coverage: true,
  reporters: [
    defaultReporter(),
    junitReporter({
      outputPath: 'junit/browser-test-results.xml',
    }),
  ],
  testFramework: {
    type: 'mocha',
    config: {
      timeout: 20000, // 20 seconds for browser tests
    },
  },
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'firefox' }),
    playwrightLauncher({ product: 'webkit' }),
  ],
  coverageConfig: {
    report: true,
    reportDir: 'coverage-browser',
    exclude: [
      'test/**',
      'node_modules/**',
      '**/*.test.js',
      'scripts/**',
    ],
  },
  files: [
    'test/**/*.test.html',
    'test/**/*.test.js',
  ],
  middleware: [
    // Serve livereload.js from node_modules
    async function serveLiveReload(context, next) {
      if (context.url === '/__internal__/livereload.js') {
        context.url = '/vendor/livereload.js';
      }
      await next();
    },
  ],
};
