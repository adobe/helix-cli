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
require('@snyk/nodejs-runtime-agent')({
  projectId: '44fb83e0-fe5c-4cee-94bc-9f5349737356',
});
/* eslint-disable import/no-extraneous-dependencies */
const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');

const testDir = './test';
const mocha = new Mocha();

fs.readdirSync(testDir).filter(file => file.substr(-3) === '.js').forEach((file) => {
  mocha.addFile(
    path.join(testDir, file),
  );
});

// Run the tests.
mocha.run((failures) => {
  process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures
  process.exit(failures ? 1 : 0);
});
