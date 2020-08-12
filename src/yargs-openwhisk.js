/*
 * Copyright 2019 Adobe. All rights reserved.
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
    .option('wsk-auth', {
      alias: 'wskAuth',
      describe: 'Adobe I/O Runtime Authentication key',
      default: '',
      coerce: (v) => (v.trim() ? v.trim() : undefined),
      type: 'string',
    })
    .option('wsk-namespace', {
      alias: 'wskNamespace',
      describe: 'Adobe I/O Runtime Namespace',
      default: '',
      coerce: (v) => (v.trim() ? v.trim() : undefined),
      type: 'string',
    })
    .option('wsk-host', {
      alias: 'wskHost',
      describe: 'Adobe I/O Runtime API Host',
      type: 'string',
      default: 'adobeioruntime.net',
    })
    .option('wsk-action-memory', {
      alias: 'wskActionMemory',
      describe: 'the maximum memory LIMIT in MB for the action',
      type: 'number',
    })
    .option('wsk-action-concurrency', {
      alias: 'wskActionConcurrency',
      describe: 'the maximum number of cuncurrent activations of the action',
      type: 'number',
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
