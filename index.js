#!/usr/bin/env node

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

import CLI from './src/cli.js';
import { checkNodeVersion, validateDotEnv } from './src/config/config-utils.js';
import { config } from 'dotenv';

config({ quiet: true });

(async () => {
  await checkNodeVersion();
  await validateDotEnv();
  await new CLI().run(process.argv.slice(2));
})();
