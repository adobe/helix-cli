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
/* eslint no-console: off */

const Bundler = require('parcel-bundler');
const glob = require('glob');
const { DEFAULT_OPTIONS, defaultArgs } = require('./defaults.js');
const HelixProject = require('@adobe/petridish/src/HelixProject.js');

module.exports = {
  command: 'up',
  description: 'Run a Helix development server',
  builder: (yargs) => {
    defaultArgs(yargs).help();
  },
  handler: (argv) => {
    // override default options with command line arguments
    const myoptions = {
      ...DEFAULT_OPTIONS,
      watch: true,
      cache: argv.cache,
      minify: argv.minify,
      outDir: argv.target,
    };

    // expand patterns from command line arguments
    const myfiles = argv.files.reduce((a, f) => [...a, ...glob.sync(f)], []);

    const bundler = new Bundler(myfiles, myoptions);

    const project = new HelixProject();

    bundler.on('buildEnd', () => {
      if (project.started) {
        // todo
        // project.invalidateCache();
        return;
      }
      project.start();
    });

    project.init().then(() => {
      bundler.bundle();
    }).catch((e) => {
      // todo: use proper logger
      console.error(`${e}`);
    });
  },
};
