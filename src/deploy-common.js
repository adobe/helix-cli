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

module.exports = function commonArgs(yargs) {
  return yargs
    .env('HLX')
    .strict(false)
    .option('wsk-auth', {
      describe: 'Adobe I/O Runtime Authentication key',
      type: 'string',
      env: 'HLX_WSK_AUTH',
    })
    .option('wsk-namespace', {
      describe: 'Adobe I/O Runtime Namespace',
      type: 'string',
      demandOption: true,
      env: 'HLX_WSK_NAMESPACE',
    })
    .option('wsk-host', {
      describe: 'Adobe I/O Runtime API Host',
      type: 'string',
      default: 'runtime.adobe.io',
    })
    .option('dry-run', {
      describe: 'List the actions that would be created, but do not actually deploy',
      type: 'boolean',
      default: false,
    })
    .demandOption(
      'wsk-auth',
      'Authentication is required. You can pass the key via the HLX_WSK_AUTH environment variable, too',
    )
    .demandOption(
      'wsk-namespace',
      'OpenWhisk Namespace is required',
    );
};
