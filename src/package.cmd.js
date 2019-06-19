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
const chalk = require('chalk');
const glob = require('glob');
const path = require('path');
const fs = require('fs');
const ProgressBar = require('progress');
const { ZipFile } = require('yazl');
const AbstractCommand = require('./abstract.cmd.js');
const ActionBundler = require('./parcel/ActionBundler.js');
const { multiline } = require('@adobe/helix-shared').string;
const { map, join, find, contains } = require('ferrum');

class PackageCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._target = null;
    this._onlyModified = false;
    this._enableMinify = false;
  }

  // eslint-disable-next-line class-methods-use-this
  get requireConfigFile() {
    return false;
  }

  withTarget(value) {
    this._target = value;
    return this;
  }

  withOnlyModified(value) {
    this._onlyModified = value;
    return this;
  }

  withMinify(value) {
    this._enableMinify = value;
    return this;
  }

  async init() {
    await super.init();
    this._target = path.resolve(this.directory, this._target);
  }

  /**
   * Uses webpack to bundle each openwhisk action script given.
   *
   * This loads the scripts specified by the scripts parameter (usually
   * all scripts in .hlx/build/), bundles these scripts together with their
   * dependencies using webpack (yielding a single <name>.bundle.js) and
   * writes those back to disk.
   *
   * @param {*[]} scripts Array containing info about the scripts that
   *   need bundling. Each entry represents one script in .hlx/build/;
   *   each entry yields one openwhisk action.
   * @param {ProgressBar} bar the progress bar
   */
  async createBundles(entry, bar) {
    const progressHandler = (percent, msg, ...args) => {
      /* eslint-disable no-param-reassign */
      const action = args.length > 0 ? `${msg} ${args[0]}` : msg;
      const rt = bar.renderThrottle;
      if (msg !== 'bundling') {
        // this is kind of a hack to force redraw for non-bundling steps.
        bar.renderThrottle = 0;
      }
      bar.update(percent * 0.8, { action });
      bar.renderThrottle = rt;
      /* eslint-enable no-param-reassign */
    };

    // create the bundles
    const bundler = new ActionBundler()
      .withDirectory(this._target)
      .withModulePaths(['node_modules', path.resolve(__dirname, '..', 'node_modules')])
      .withLogger(this.log)
      .withProgressHandler(progressHandler)
      .withMinify(this._enableMinify);

    const stats = await bundler.run(entry);
    if (stats.errors) {
      stats.errors.forEach(this.log.error);
    }
    if (stats.warnings) {
      stats.warnings.forEach(this.log.warn);
    }
  }

  async run() {
    await this.init();

    // we reserve 80% for bundling the scripts and 20% for creating the zip files.
    const bar = new ProgressBar('[:bar] :action :elapseds', {
      total: 10,
      width: 50,
      renderThrottle: 0,
      stream: process.stdout,
    });

    await this.createBundles({static: path.resolve(__dirname, 'openwhisk/static.js')}, bar);

    // Create the zip file from our js bundle

    const staticJsFile = path.resolve(this._target, 'static.bundle.js');
    const zip = new ZipFile();
    zip.addFile(staticJsFile, 'index.js');
    zip.outputStream.pipe(fs.createWriteStream(staticJsFile + '.zip'));
    // need to create this promise before end is called, otherwise clouse
    // could be triggered before the promise is created
    const done = new Promise((res) => zip.outputStream.on('close', res));
    zip.end();
    await done;

    this.log.info('✅  packaging completed');
    return this;
  }
}
module.exports = PackageCommand;
