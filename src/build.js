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

'use strict';

/* eslint global-require: off */

const { defaultArgs } = require('./defaults.js');
const { logArgs, makeLogger } = require('./log-common.js');

module.exports = function build() {
  let executor;
  return {
    set executor(value) {
      executor = value;
    },
    command: 'build [files..]',
    desc: 'Compile the template functions and build package',
    builder: (yargs) => {
      defaultArgs(yargs);
      logArgs(yargs).help();
    },
    handler: async (argv) => {
      if (!executor) {
        // eslint-disable-next-line global-require
        const BuildCommand = require('./build.cmd'); // lazy load the handler to speed up execution time
        executor = new BuildCommand(makeLogger(argv));
      }

      await executor
        .withCacheEnabled(argv.cache)
        .withMinifyEnabled(argv.minify)
        .withTargetDir(argv.target)
        .withFiles(argv.files)
        .run();
    },
  };
};
