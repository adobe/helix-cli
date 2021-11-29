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
import crypto from 'crypto';
import fs from 'fs';

export default function md5(string, encoding = 'hex') {
  return crypto
    .createHash('md5')
    .update(string)
    .digest(encoding);
}

md5.file = async function md5File(filename) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5').setEncoding('hex');
    fs.createReadStream(filename)
      .on('data', (data) => {
        hash.update(data);
      })
      .on('end', () => {
        resolve(hash.digest('hex'));
      })
      .on('error', reject);
  });
};
