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

module.exports = function include(srcfile) {
  return fs.readFileSync(srcfile).toString().replace(/(synthetic \{"include:.*"\};)/g, (m) => {
    const ref = m.replace(/^synthetic \{"include:/, '').replace(/"};$/, '');
    const name = path.resolve(path.dirname(srcfile), ref);
    const content = fs.readFileSync(name).toString();
    return `synthetic {"${content}"};`;
  });
};
