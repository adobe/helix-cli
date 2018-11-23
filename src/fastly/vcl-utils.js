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
const URI = require('uri-js');

function conditions(strain) {
  if (strain.url) {
    const uri = URI.parse(strain.url);
    if (uri.path && uri.path !== '/') {
      const pathname = uri.path.replace(/\/$/, '');
      return Object.assign({
        sticky: false,
        condition: `req.http.Host == "${uri.host}" && (req.url.dirname ~ "^${pathname}$" || req.url.dirname ~ "^${pathname}/")`,
        vcl: `
  set req.http.X-Dirname = regsub(req.url.dirname, "^${pathname}", "");`,
      }, strain);
    }
    return Object.assign({
      condition: `req.http.Host == "${uri.host}"`,
    }, strain);
  }
  if (strain.condition && strain.sticky === undefined) {
    return Object.assign({
      sticky: true,
    }, strain);
  }
  return strain;
}

module.exports = {conditions}