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
const fs = require('fs-extra');
const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const mime = require('mime-types');
// eslint-disable-next-line import/no-unresolved
const pipeline = require('./main.js').main;

const DIST_DIR = path.resolve(__dirname, 'dist');

async function main(params, ...args) {
  const urlPath = params.path;

  // normal pipeline request
  if (!urlPath.startsWith('/dist/')) {
    return pipeline(params, ...args);
  }

  const filePath = path.resolve(DIST_DIR, urlPath.substring(6));
  if (!filePath.startsWith(DIST_DIR)) {
    // outside dist dir...reject
    return {
      statusCode: 404,
    };
  }
  if (!await fs.pathExists(filePath)) {
    return {
      statusCode: 404,
    };
  }
  const file = await fs.readFile(filePath);
  const type = mime.lookup(filePath);
  let binary = true;
  if (type.match(/text\/.*/)) {
    binary = false;
  } else if (type.match(/.*\/javascript/)) {
    binary = false;
  } else if (type.match(/.*\/.*json/)) {
    binary = false;
  }
  // eslint-disable-next-line no-console
  console.log(`file ${filePath} type ${type} binary ${binary}`);
  const body = binary ? file.toString('base64') : file.toString();
  return {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'max-age=1314000',
    },
    body,
  };
}

module.exports.main = main;
