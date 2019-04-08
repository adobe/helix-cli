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

module.exports = {
  // modules that are provided by the runtime container
  externals: {
    express: '4.16.4',
    openwhisk: '3.18.0',
    'body-parser': '1.18.3',
    'cls-hooked': '4.2.2',
    request: '2.88.0',
    'request-promise': '4.2.2',

    // webpack isn't really provided by the container, but it injects itself into the list of
    // deps, so we exclude it here.
    webpack: true,

    // helix-cli is never useful as dependency, but it gets drawn in by static.js
    '@adobe/helix-cli': true,
  },
};
