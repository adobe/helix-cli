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
    'alexa-sdk': true,
    apn: true,
    // async: true, (we need 2.6.1; container provides 2.1.4)
    'body-parser': true,
    btoa: true,
    cheerio: true,
    cloudant: true,
    commander: true,
    consul: true,
    'continuation-local-storage': true,
    'cookie-parser': true,
    cradle: true,
    errorhandler: true,
    express: true,
    'express-session': true,
    glob: true,
    gm: true,
    'iconv-lite': true,
    lodash: true,
    log4js: true,
    marked: true,
    merge: true,
    moment: true,
    mongodb: true,
    mustache: true,
    nano: true,
    'node-uuid': true,
    nodemailer: true,
    'oauth2-server': true,
    openwhisk: true,
    pkgcloud: true,
    process: true,
    pug: true,
    redis: true,
    // request: true,
    'request-promise': true,
    rimraf: true,
    semver: true,
    sendgrid: true,
    'serve-favicon': true,
    'socket.io': true,
    'socket.io-client': true,
    superagent: true,
    'swagger-tools': true,
    tmp: true,
    twilio: true,
    underscore: true,
    // uuid: true,
    validator: true,
    'watson-developer-cloud': true,
    // webpack injects itself during the collection phase due to a reference to `require.cache`
    // currently it is not needed in the action, so we deliberately exclude it here.
    webpack: true,
    when: true,
    // 'winston',  (we need 3.x; container provides 2.x)
    ws: true,
    xml2js: true,
    xmlhttprequest: true,
    yauzl: true,
  },
};
