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

module.exports.logArgs = yargs => yargs
  .option('log-file', {
    describe: 'Log file (use - for stdout)',
    type: 'string',
    default: '-',
  })
  .option('log-level', {
    describe: 'Log level',
    type: 'string',
    choices: ['silly', 'debug', 'verbose', 'info', 'warn', 'error'],
    default: 'info',
  });
