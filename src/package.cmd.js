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
const glob = require('glob');
const path = require('path');
const fs = require('fs-extra');
const ProgressBar = require('progress');
const { Bundler, BaseConfig } = require('@adobe/helix-deploy');
const AbstractCommand = require('./abstract.cmd.js');
const BuildCommand = require('./build.cmd.js');

/**
 * Uses webpack to bundle each template script and creates an OpenWhisk action for each.
 */
class PackageCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._target = null;
    this._files = null;
    this._modulePaths = [];
    this._requiredModules = null;
    this._onlyModified = false;
    this._enableMinify = false;
    this._customPipeline = null;
  }

  // eslint-disable-next-line class-methods-use-this
  get requireConfigFile() {
    return false;
  }

  withTarget(value) {
    this._target = value;
    return this;
  }

  withFiles(value) {
    this._files = value;
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

  withModulePaths(value) {
    this._modulePaths = value;
    return this;
  }

  withRequiredModules(mods) {
    this._requiredModules = mods;
    return this;
  }

  withCustomPipeline(customPipeline) {
    this._customPipeline = customPipeline;
    return this;
  }

  async init() {
    await super.init();
    this._target = path.resolve(this.directory, this._target);
    // read the package json if present
    try {
      this._pkgJson = await fs.readJson(path.resolve(this.directory, 'package.json'));
    } catch (e) {
      this._pkgJson = {};
    }
  }

  /**
   * Creates a .zip package that contains the contents to be deployed.
   *
   * @param {ActionInfo} info - The action info object.
   */
  async createPackage(info) {
    const buildConfig = new BaseConfig()
      .withName(info.name)
      .withVersion(this._pkgJson.version || '1.0.0')
      .withBundlePath(info.bundlePath)
      .withZipPath(info.zipFile)
      .withLogger(this.log);
    buildConfig.baseName = info.name;
    const bundler = new Bundler()
      .withConfig(buildConfig);
    const data = await bundler.createArchive();
    // eslint-disable-next-line no-param-reassign
    info.archiveSize = data.size;
    this.emit('create-package', info);
  }

  /**
   * Creates the action bundles from the given scripts. It uses helix-deploy which
   * in turn uses webpack to create individual bundles of the {@code script}. The final bundles
   * are written to the {@code this._target} directory.
   *
   * @param {ActionInfo[]} actionInfos - the script information.
   * @param {ProgressBar} bar - The progress bar.
   */
  async createBundles(actionInfos, bar) {
    let total = 0;
    const progressHandler = (percent, msg, ...args) => {
      /* eslint-disable no-param-reassign */
      const action = args.length > 0 ? `${msg} ${args[0]}` : msg;
      const rt = bar.renderThrottle;
      if (msg !== 'building') {
        // this is kind of a hack to force redraw for non-bundling steps.
        bar.renderThrottle = 0;
      }
      bar.update((total + percent) / actionInfos.length, { action });
      bar.renderThrottle = rt;
      /* eslint-enable no-param-reassign */
    };
    const bundlers = [];
    for (const actionInfo of actionInfos) {
      const buildConfig = new BaseConfig()
        .withEntryFile(actionInfo.main)
        .withBundlePath(actionInfo.bundlePath)
        .withZipPath(actionInfo.zipFile)
        .withDepInfoPath(actionInfo.depFile)
        .withMinify(this._enableMinify)
        .withModulePaths(this._modulePaths)
        .withLogger(this.log);

      buildConfig.progressHandler = progressHandler;
      const bundler = new Bundler()
        .withConfig(buildConfig);
      // eslint-disable-next-line no-await-in-loop
      await bundler.init();
      // eslint-disable-next-line no-await-in-loop
      const stats = await bundler.createBundle();
      if (stats.errors) {
        stats.errors.forEach((msg) => this.log.error(msg));
      }
      if (stats.warnings) {
        stats.warnings.forEach((msg) => this.log.warn(msg));
      }
      if (stats.errors && stats.errors.length > 0) {
        throw new Error('Error while bundling packages.');
      }
      total += 1;
      bundlers.push(bundler);
    }

    // validate bundles
    for (const bundler of bundlers) {
      // eslint-disable-next-line no-await-in-loop
      await bundler.validateBundle();
    }
  }

  /**
   * Run this command.
   */
  async run() {
    await this.init();

    // always run build first to make sure scripts are up to date
    const build = new BuildCommand(this.log)
      .withFiles(this._files)
      .withModulePaths(this._modulePaths)
      .withRequiredModules(this._requiredModules)
      .withCustomPipeline(this._customPipeline)
      .withDirectory(this.directory)
      .withTargetDir(this._target);
    await build.run();
    this._modulePaths = build.modulePaths;

    // get the list of scripts from the info files
    const infos = [...glob.sync(`${this._target}/**/*.info.json`)];
    let scripts = await Promise.all(infos.map((info) => fs.readJSON(info)));

    // filter out the ones that already have the info and a valid zip file
    if (this._onlyModified) {
      await Promise.all(scripts.map(async (script) => {
        // check if zip exists, and if not, clear the path entry
        if (!script.zipFile || !(await fs.pathExists(script.zipFile))) {
          // eslint-disable-next-line no-param-reassign
          delete script.zipFile;
        }
      }));
      scripts.filter((script) => script.zipFile).forEach((script) => {
        this.emit('ignore-package', script);
      });
      scripts = scripts.filter((script) => !script.zipFile);
    }

    if (scripts.length > 0) {
      // generate additional infos
      scripts.forEach((script) => {
        /* eslint-disable no-param-reassign */
        script.name = path.basename(script.main, '.js');
        script.bundleName = `${script.name}.bundle.cjs`;
        script.bundlePath = path.resolve(script.buildDir, script.bundleName);
        script.dirname = path.dirname(script.main);
        script.archiveName = `${script.name}.zip`;
        script.zipFile = path.resolve(script.buildDir, script.archiveName);
        script.depFile = path.resolve(script.buildDir, `${script.name}.dependencies.json`);
        /* eslint-enable no-param-reassign */
      });

      // we reserve 80% for bundling the scripts and 20% for creating the zip files.
      const bar = new ProgressBar('[:bar] :action :elapseds', {
        total: 100,
        width: 50,
        renderThrottle: 50,
        stream: process.stdout,
      });

      // create bundles
      await this.createBundles(scripts, bar);

      // package actions
      await Promise.all(scripts.map((script) => this.createPackage(script, bar)));

      // write back the updated infos
      // eslint-disable-next-line max-len
      await Promise.all(scripts.map((script) => fs.writeJson(script.infoFile, script, { spaces: 2 })));
    }

    this.log.info('✅  packaging completed');
    return this;
  }
}
module.exports = PackageCommand;
