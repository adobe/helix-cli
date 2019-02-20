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
const fs = require('fs');
const _ = require('lodash');
const { utils } = require('./helper.js');
const { utils2 } = require('./utils/another_helper.js');

module.exports.pre = (payload, action) => {
  payload.content.time = new Date() + _.camelCase('hello world.');
  payload.content.pkg = fs.readFileSync('package.json');
  payload.content.stamp = utils.stamp() + utils2.stamp();
  payload.resourcePath = action.request.params.path;
};
