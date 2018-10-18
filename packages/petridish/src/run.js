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

const colors = require('colors');
const HelixProject = require('./HelixProject.js');

async function run() {
  const project = new HelixProject();
  await project.init();
  await project.start();
}

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('Encountered uncaught exception at process level', err);
});

process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('Encountered unhandled promise rejection at process level', err);
});

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(colors.red(err));
  process.exit(1);
});
