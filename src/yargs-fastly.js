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
    .option('fastly-serviceid', {
      alias: ['fastlyNamespace', 'fastly-namespace', 'fastlyServiceid'],
      describe: 'CDN Namespace (e.g. Fastly Service ID).',
      default: '',
      coerce: (v) => (v.trim() ? v.trim() : undefined),
      type: 'string',
    })
    .option('fastly-auth', {
      alias: 'fastlyAuth',
      describe: 'API Key for Fastly API ($HLX_FASTLY_AUTH)',
      default: '',
      coerce: (v) => (v.trim() ? v.trim() : undefined),
      type: 'string',
    });
};