/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const path = require('path');
const { execFile } = require('child_process');
const fse = require('fs-extra');
const chalk = require('chalk');

const NODE_MODULES_PAT = `${path.sep}node_modules${path.sep}`;

function execAsync(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const c = execFile(cmd, args, opts, (err, stdout, stderr) => {
      if (err) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
    c.stdout.pipe(process.stdout);
    c.stderr.pipe(process.stderr);
  });
}

/**
 * Helper for installing modules for the build process.
 *
 * Some modules, like the helix-pipeline should be present on the module path when building,
 * running and packaging the bundles.
 *
 * If a module is not present in the projects resolution path, it will be added to
 * `./hlx/build/node_modules`.
 */
class ModuleHelper {
  constructor() {
    this._logger = console;
    this._cwd = process.cwd();
    this._files = ['src/**/*.htl', 'src/**/*.js', 'src/**/*.jsx', 'cgi-bin/**/*.js'];
    this._buildDir = '.hlx/build';
    this._modulePaths = [];
  }

  withDirectory(d) {
    this._cwd = d;
    return this;
  }

  withLogger(value) {
    this._logger = value;
    return this;
  }

  withBuildDir(value) {
    this._buildDir = value;
    return this;
  }

  withModulePaths(value) {
    this._modulePaths = value;
    return this;
  }

  get log() {
    return this._logger;
  }

  get directory() {
    return this._cwd;
  }

  get modulePaths() {
    return this._modulePaths;
  }

  async readBuildPkgJson() {
    this._buildPkgJson = await fse.readJson(this._buildPkgJson);
  }

  async init() {
    this._buildDir = path.resolve(this._cwd, this._buildDir);
    this._buildPkgJson = path.resolve(this._buildDir, 'package.json');

    // ensure that the build dir has a package.json
    if (!(await fse.pathExists(this._buildPkgJson))) {
      await fse.ensureDir(this._buildDir);
      await fse.writeJson(this._buildPkgJson, {
        name: path.basename(this.directory),
        version: '1.0.0',
        private: true,
      }, {
        spaces: 2,
      });
    }
    await this.readBuildPkgJson();

    if (this._modulePaths.length === 0) {
      this._modulePaths = [
        path.resolve(this._buildDir, 'node_modules'),
      ];
    }
  }

  async getModuleInfo(name) {
    let libPath;
    try {
      libPath = require.resolve(name, {
        paths: this._modulePaths,
      });
    } catch (e) {
      return null;
    }

    // the lib path usually points to the index file, so construct the mod path
    const idx = libPath.lastIndexOf(NODE_MODULES_PAT);
    let modPath;
    if (idx < 0) {
      // look for package.json in parent directory
      modPath = path.dirname(libPath);
      if (!await fse.pathExists(path.resolve(modPath, 'package.json'))) {
        modPath = path.dirname(modPath);
      }
    } else {
      modPath = `${libPath.substring(0, idx + NODE_MODULES_PAT.length)}${name}`;
    }

    try {
      const pkg = await fse.readJson(path.resolve(modPath, 'package.json'));
      return {
        path: modPath,
        package: pkg,
      };
    } catch (e) {
      throw Error(`Unable to load module package.json: ${e}`);
    }
  }

  async installModule(name, descriptor) {
    try {
      let loglevel = 'silent';
      if (this.log.level === 'debug') {
        loglevel = 'info';
      }
      if (this.log.level === 'silly') {
        loglevel = 'silly';
      }

      // if path to local directory, use npm link instead
      let moduleDescriptor = descriptor || name;
      let cmd = 'install';
      const localPath = descriptor ? path.resolve(this.directory, descriptor) : null;
      if (localPath && await fse.pathExists(localPath)) {
        cmd = 'link';
        moduleDescriptor = localPath;
      } else if (await fse.pathExists(path.resolve(this._buildDir, 'package-lock.json'))) {
        cmd = 'ci';
      }

      this.log.info(chalk`Running {grey npm ${cmd} ${moduleDescriptor}} in {grey ${path.relative(this.directory, this._buildDir)}} ...`);
      // todo: maye use npm API instead, so that we can show a nice progress bar.
      // todo: since stderr is not a TTY when executed with shelljs, we don't see it.
      await execAsync('npm', [cmd, '--only=prod', '--prefer-offline', '--ignore-scripts',
        '--no-bin-links', '--no-audit', '--save-exact', '--loglevel', loglevel, '--no-fund',
        '--progress', 'true', moduleDescriptor], {
        cwd: this._buildDir,
        shell: true,
      });
    } catch (e) {
      throw Error(`Unable to install ${name}: ${e}`);
    }
  }

  async ensureModule(name, descriptor) {
    const { log } = this;
    let info = await this.getModuleInfo(name);
    if (!info) {
      log.info(chalk`Module {yellow ${name}} not found.`);
      await this.installModule(name, descriptor);
    }
    info = await this.getModuleInfo(name);
    if (!info) {
      throw Error(`Module ${name} still not found. aborting.`);
    }
    log.info(chalk`Using {yellow ${name}} version {yellow ${info.package.version}} from {grey ${path.relative(this.directory, info.path)}}.`);
  }

  async ensureModules(names) {
    // todo: invoke npm with all required modules at once
    return Promise.all(names.map((mod) => this.ensureModule(mod.name, mod.descriptor)));
  }
}

module.exports = ModuleHelper;
