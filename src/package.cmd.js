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

const chalk = require('chalk');
const glob = require('glob');
const path = require('path');
const fs = require('fs-extra');
const ProgressBar = require('progress');
const archiver = require('archiver');
const AbstractCommand = require('./abstract.cmd.js');
const packageCfg = require('./parcel/packager-config.js');
const ExternalsCollector = require('./parcel/ExternalsCollector.js');
const { flattenDependencies } = require('./packager-utils.js');

class PackageCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._target = null;
    this._onlyModified = false;
  }

  withTarget(value) {
    this._target = value;
    return this;
  }

  withOnlyModified(value) {
    this._onlyModified = value;
    return this;
  }

  async init() {
    await super.init();
    this._target = path.resolve(this.directory, this._target);
  }

  /**
   * Creates a .zip package that contains the contents to be deployed to openwhisk.
   * @param info The action info object
   * @param info.name Name of the action
   * @param info.main Main script of the action
   * @param info.externals External modules
   * @param info.requires Local dependencies
   * @param bar progress bar
   * @returns {Promise<any>} Promise that resolves to the package file {@code path}.
   */
  async createPackage(info, bar) {
    const { log } = this;

    const tick = (message, name) => {
      const shortname = name.replace(/\/package.json.*/, '').replace(/node_modules\//, '');
      bar.tick({
        action: name ? `packaging ${shortname}` : '',
      });
      if (message) {
        this.log.maybe({
          progress: true,
          level: 'info',
          message,
        });
      }
    };

    return new Promise((resolve, reject) => {
      const ticks = {};
      const archiveName = { info };
      let hadErrors = false;

      // create zip file for package
      const output = fs.createWriteStream(info.zipFile);
      const archive = archiver('zip');

      log.debug(`preparing package ${archiveName}`);
      output.on('close', () => {
        if (!hadErrors) {
          log.debug(`${archiveName}: Created package. ${archive.pointer()} total bytes`);
          resolve(info);
        }
      });
      archive.on('entry', (data) => {
        log.debug(`${archiveName}: A ${data.name}`);
        if (ticks[data.name]) {
          tick('', data.name);
        }
      });
      archive.on('warning', (err) => {
        log.error(`${chalk.redBright('[error] ')}Unable to create archive: ${err.message}`);
        hadErrors = true;
        reject(err);
      });
      archive.on('error', (err) => {
        log.error(`${chalk.redBright('[error] ')}Unable to create archive: ${err.message}`);
        hadErrors = true;
        reject(err);
      });

      const packageJson = {
        name: info.name,
        version: '1.0',
        description: `Lambda function of ${info.name}`,
        main: path.basename(info.main),
        license: 'Apache-2.0',
      };

      archive.pipe(output);
      archive.append(JSON.stringify(packageJson, null, '  '), { name: 'package.json' });

      info.files.forEach((file) => {
        const name = path.basename(file);
        archive.file(path.resolve(this._target, file), { name });
        ticks[name] = true;
      });

      // add modules that cause problems when embeded in webpack
      Object.keys(info.externals).forEach((mod) => {
        archive.directory(info.externals[mod], `node_modules/${mod}`);
        ticks[`node_modules/${mod}/package.json`] = true;
      });

      archive.finalize();
    });
  }

  async run() {
    await this.init();

    // get the list of scripts from the info files
    const infos = [...glob.sync(`${this._target}/*.info.json`)];
    const scriptInfos = await Promise.all(infos.map(info => fs.readJSON(info)));

    // resolve dependencies
    let scripts = flattenDependencies(scriptInfos);

    // add static action
    scripts.push({
      main: path.resolve(__dirname, 'openwhisk', 'static.js'),
      isStatic: true,
      requires: [],
    });

    // generate action names
    scripts.forEach((script) => {
      /* eslint-disable no-param-reassign */
      script.name = path.basename(script.main, '.js');
      script.archiveName = `${script.name}.zip`;
      script.zipFile = path.resolve(this._target, script.archiveName);
      script.infoFile = path.resolve(this._target, `${script.name}.info.json`);
      /* eslint-enable no-param-reassign */
    });

    // filter out the not modified ones
    if (this._onlyModified) {
      await Promise.all(scripts.map(async (script) => {
        // check if zip exists
        if (!(await fs.pathExists(script.zipFile))) {
          return;
        }
        // static is always up-to-date
        if (script.isStatic) {
          this.log.info(`${script.archiveName} is up-to-date. skipping.`);
          // eslint-disable-next-line no-param-reassign
          script.skip = true;
          return;
        }

        const infoLastModified = (await fs.stat(script.infoFile)).mtime;
        const zipLastModified = (await fs.stat(script.zipFile)).mtime;
        if (zipLastModified >= infoLastModified) {
          this.log.info(`${script.archiveName} is up-to-date. skipping.`);
          // eslint-disable-next-line no-param-reassign
          script.skip = true;
        }
        // eslint-disable-next-line no-param-reassign
        script.name = path.basename(script.main, '.js');
      }));
      scripts = scripts.filter(script => !script.skip);
    }

    const bar = new ProgressBar('[:bar] :action :etas', {
      total: scripts.length * 2,
      width: 50,
      renderThrottle: 1,
      stream: process.stdout,
    });

    // collect all the external modules of the scripts
    let steps = 0;
    await Promise.all(scripts.map(async (script) => {
      const collector = new ExternalsCollector()
        .withDirectory(this._target)
        .withExternals(Object.keys(packageCfg.externals));

      // eslint-disable-next-line no-param-reassign
      script.files = [script.main, ...script.requires].map(f => path.resolve(this._target, f));
      bar.tick(1, {
        action: `analyzing ${path.basename(script.main)}`,
      });
      // eslint-disable-next-line no-param-reassign
      script.externals = await collector.collectModules(script.files);
      steps += Object.keys(script.externals).length + script.files.length;
      bar.tick(1, {
        action: `analyzing ${path.basename(script.main)}`,
      });
    }));

    // trigger new progress bar
    bar.total += steps;

    // package actions
    await Promise.all(scripts.map(script => this.createPackage(script, bar)));

    this.log.info('✅  packaging completed');
    return this;
  }
}
module.exports = PackageCommand;
