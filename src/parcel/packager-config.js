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
  externals: [
    'lodash',
    'alexa-sdk',
    'apn',
    'async',
    'body-parser',
    'btoa',
    'cheerio',
    'cloudant',
    'commander',
    'consul',
    'continuation-local-storage',
    'cookie-parser',
    'cradle',
    'errorhandler',
    'express',
    'express-session',
    'glob',
    'gm',
    'iconv-lite',
    'lodash',
    'log4js',
    'marked',
    'merge',
    'moment',
    'mongodb',
    'mustache',
    'nano',
    'node-uuid',
    'nodemailer',
    'oauth2-server',
    'openwhisk',
    'pkgcloud',
    'process',
    'pug',
    'redis',
    'request',
    'request-promise',
    'rimraf',
    'semver',
    'sendgrid',
    'serve-favicon',
    'socket.io',
    'socket.io-client',
    'superagent',
    'swagger-tools',
    'tmp',
    'twilio',
    'underscore',
    'uuid',
    'validator',
    'watson-developer-cloud',
    'when',
    // 'winston', // (we need 3.x; container provides 2.x)
    'ws',
    'xml2js',
    'xmlhttprequest',
    'yauzl',
  ],

  // modules that are not provided by the runtime container but cause problems in webpack.
  bundled: [
    'request-promise-native', // causes errors when embedded

    'jsdom', // produces warnings during packaging
    // jsdom dependencies
    'pn',
    'html-encoding-sniffer',
    'whatwg-encoding',
    'whatwg-url',
    'whatwg-mimetype',
    'webidl-conversions',
    'tr46',
    'lodash.sortby',
    'cssstyle',
    'cssom',
    'w3c-hr-time',
    'browser-process-hrtime',
    'symbol-tree',
    'domexception',
    'abab',
    'data-urls',
    'nwsapi',
    'parse5',
    'xml-name-validator',
    'saxes',
    'xmlchars',
    'array-equal',
  ],
};
