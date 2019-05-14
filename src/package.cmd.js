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
const StaticCommand = require('./static.cmd.js');
const packageCfg = require('./parcel/packager-config.js');
const ExternalsCollector = require('./parcel/ExternalsCollector.js');
const { flattenDependencies } = require('./packager-utils.js');

class PackageCommand extends StaticCommand {
  constructor(logger) {
    super(logger);
    this._target = null;
    this._onlyModified = false;
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
      const archiveName = path.basename(info.zipFile);
      let hadErrors = false;

      // create zip file for package
      const output = fs.createWriteStream(info.zipFile);
      const archive = archiver('zip');

      log.debug(`preparing package ${archiveName}`);
      output.on('close', () => {
        if (!hadErrors) {
          log.debug(`${archiveName}: Created package. ${archive.pointer()} total bytes`);
          // eslint-disable-next-line no-param-reassign
          info.archiveSize = archive.pointer();
          this.emit('create-package', info);
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
        // if the module was linked via `npm link`, then it is a checked-out module, and should
        // not be included as-is.
        const modPath = info.externals[mod];
        if (modPath.indexOf('/node_modules/') < 0) {
          // todo: async
          // todo: read .npmignore
          const files = glob.sync('!(.git|node_modules|logs|docs|coverage)/**', {
            cwd: modPath,
            matchBase: false,
          });
          files.forEach((name) => {
            archive.file(path.resolve(modPath, name), { name: `node_modules/${mod}/${name}` });
          });
        } else {
          archive.directory(modPath, `node_modules/${mod}`);
          ticks[`node_modules/${mod}/package.json`] = true;
        }
      });

      archive.finalize();
    });
  }

  async run() {
    await this.init();

    // get the list of scripts from the info files
    const infos = [...glob.sync(`${this._target}/**/*.info.json`)];
    const scriptInfos = await Promise.all(infos.map(info => fs.readJSON(info)));

    // resolve dependencies
    let scripts = flattenDependencies(scriptInfos);

    // add the static script if missing
    if (!scripts.find(script => script.isStatic)) {
      // add static action
      scripts.push({
        main: path.resolve(__dirname, 'openwhisk', 'static.js'),
        isStatic: true,
        requires: [],
      });
    }

    // filter out the ones that already have the info and a valid zip file
    if (this._onlyModified) {
      await Promise.all(scripts.map(async (script) => {
        // check if zip exists, and if not, clear the path entry
        if (!script.zipFile || !(await fs.pathExists(script.zipFile))) {
          // eslint-disable-next-line no-param-reassign
          delete script.zipFile;
        }
      }));
      scripts.filter(script => script.zipFile).forEach((script) => {
        this.emit('ignore-package', script);
      });
      scripts = scripts.filter(script => !script.zipFile);
    }

    // generate additional infos
    scripts.forEach((script) => {
      /* eslint-disable no-param-reassign */
      script.name = path.basename(script.main, '.js');
      script.dirname = script.isStatic ? '' : path.dirname(script.main);
      script.archiveName = `${script.name}.zip`;
      script.zipFile = path.resolve(this._target, script.dirname, script.archiveName);
      script.infoFile = path.resolve(this._target, script.dirname, `${script.name}.info.json`);
      /* eslint-enable no-param-reassign */
    });

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

    // write back the updated infos
    await Promise.all(scripts.map(script => fs.writeJson(script.infoFile, script, { spaces: 2 })));

    this.log.info('✅  packaging completed');
    return this;
  }
}
module.exports = PackageCommand;
