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

/* eslint-disable no-param-reassign */
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const fse = require('fs-extra');
const HtlCompiler = require('@adobe/htlengine/src/compiler/Compiler');
const Babel = require('@babel/core');
const BableJsxPlugin = require('@babel/plugin-transform-react-jsx');
const ModuleHelper = require('./ModuleHelper.js');

const SCRIPTS = ['html.js', 'json.js', 'xml.js', 'svg.js', 'css.js', 'txt.js'];
const SCRIPTS_PAT = SCRIPTS.map((s) => (`_${s}`));
const CGI_PAT = `${path.sep}cgi-bin${path.sep}`;

const RUNTIME_TEMPLATE = path.resolve(__dirname, 'RuntimeTemplate.js');
const ACTION_TEMPLATE = path.resolve(__dirname, 'ActionTemplate.js');
const DEFAULT_PIPELINE = '@adobe/helix-pipeline/src/defaults/default.js';

/**
 * Information object of an action.
 *
 * @typedef {object} ActionInfo
 * @property {string} name - The name of the action. eg 'print_html'.
 * @property {string} main - The filename of the entry script. eg 'html.js'.
 * @property {string} type - Script type. currently 'js' or 'htl'.
 * @property {string} contentType - Type of the content to be generated. 'html', 'json', ... .
 * @property {string} entryFile - The main file that this action is generated for.
 * @property {string} scriptFile - The name of the script that is executed (HTL, or pure script)
 * @property {boolean} cgi - Indicates if this is a CGI action.
 * @property {string} buildDir - The build directory of this action.
 * @property {string} pre - the 'pre' module to include.
 * @property {string} pipe - the 'pipe' module to include.
 * @property {string} infoFile - The absolute path to a json file representing this info.
 * @property {string} bundleName - The filename of the bundled script. eg 'html.bundle.js'.
 * @property {string} bundlePath - The absolute path to the bundled script.
 * @property {string} zipFile - The absolute path to the zipped action.
 * @property {string} archiveName - The filename of the zipped action. eg 'html.zip'.
 * @property {number} archiveSize - The size in bytes of the zipped action.
 * @property {object[]} dependencies - Array of module dependencies
 */


class Builder {
  static isScript(name) {
    if (SCRIPTS.indexOf(name) >= 0) {
      return true;
    }
    return SCRIPTS_PAT.find((pat) => (name.endsWith(pat)));
  }

  constructor() {
    this._cwd = process.cwd();
    this._sourceRoot = process.cwd();
    this._logger = console;
    this._files = ['src/**/*.htl', 'src/**/*.js', 'src/**/*.jsx', 'cgi-bin/**/*.js'];
    this._required = [];
    this._buildDir = '.hlx/build';
    this._showReport = false;
    this._modulePaths = [];
  }

  withDirectory(d) {
    this._cwd = d;
    return this;
  }

  withSourceRoot(value) {
    this._sourceRoot = value;
    return this;
  }

  withLogger(value) {
    this._logger = value;
    return this;
  }

  withFiles(value) {
    this._files = value;
    return this;
  }

  withShowReport(value) {
    this._showReport = value;
    return this;
  }

  withBuildDir(value) {
    this._buildDir = value;
    return this;
  }

  withModulePaths(paths) {
    this._modulePaths = paths;
    return this;
  }

  withRequiredModules(value) {
    this._required = value;
    return this;
  }

  get modulePaths() {
    return this._modulePaths;
  }

  async init() {
    this._buildDir = path.resolve(this._cwd, this._buildDir);
  }

  // eslint-disable-next-line class-methods-use-this
  async compileHtl(info) {
    const codeTemplate = await fse.readFile(RUNTIME_TEMPLATE, 'utf-8');
    const scriptFile = path.resolve(info.buildDir, `${info.name}.script.js`);
    const source = await fse.readFile(info.entryFile, 'utf-8');
    const compiler = new HtlCompiler()
      .withOutputDirectory(info.buildDir)
      .includeRuntime(true)
      .withRuntimeVar('content')
      .withRuntimeVar('request')
      .withRuntimeVar('context')
      .withRuntimeVar('payload')
      .withRuntimeGlobalName('global')
      .withCodeTemplate(codeTemplate)
      .withDefaultMarkupContext(null)
      .withSourceFile(info.entryFile)
      .withSourceMap(true);

    // eslint-disable-next-line prefer-const
    let { template, sourceMap } = await compiler.compile(source, path.dirname(info.entryFile));
    if (sourceMap) {
      info.sourceMap = `${scriptFile}.map`;
      await fse.writeFile(info.sourceMap, JSON.stringify(sourceMap), 'utf-8');
      // eslint-disable-next-line no-param-reassign
      template += `//# sourceMappingURL=${info.name}.script.js.map\n`;
    }
    await fse.writeFile(scriptFile, template, 'utf-8');
    info.scriptFile = scriptFile;
  }

  // eslint-disable-next-line class-methods-use-this
  async compileJsx(info) {
    const scriptFile = path.resolve(info.buildDir, `${info.name}.script.js`);
    const source = await fse.readFile(info.entryFile, 'utf-8');
    const code = `const h = require('hyperscript');\n${source}`;
    const options = {
      plugins: [
        [
          BableJsxPlugin,
          {
            pragma: 'h',
            pragmaFrag: 'h',
            useBuiltIns: true,
          },
        ],
      ],
      sourceMaps: true,
      sourceFileName: path.relative(info.buildDir, info.entryFile),
    };
    const result = await Babel.transformAsync(code, options);
    if (result.map) {
      info.sourceMap = `${scriptFile}.map`;
      await fse.writeFile(info.sourceMap, JSON.stringify(result.map), 'utf-8');
      result.code += `\n//# sourceMappingURL=${info.name}.script.js.map\n`;
    }
    await fse.writeFile(scriptFile, result.code, 'utf-8');
    info.scriptFile = scriptFile;
  }

  getFallbackPreprocessor(fallback) {
    const opts = {};
    if (this._modulePaths.length > 0) {
      opts.paths = this._modulePaths;
    }
    try {
      if (require.resolve(fallback, opts)) {
        return fallback;
      }
    } catch (e) {
      this._logger.debug(`${fallback} cannot be found, using default pipeline`);
    }
    return DEFAULT_PIPELINE;
  }

  // eslint-disable-next-line class-methods-use-this
  async generateScript(info) {
    let body = await fse.readFile(ACTION_TEMPLATE, 'utf-8');
    body = body.replace(/'MOD_PIPE'/, JSON.stringify(info.pipe));
    body = body.replace(/'MOD_PRE'/, JSON.stringify(info.pre));
    body = body.replace(/'MOD_SCRIPT'/, JSON.stringify(`./${path.relative(info.buildDir, info.scriptFile)}`));
    return fse.writeFile(info.main, body, 'utf-8');
  }

  async run() {
    const { _logger: log } = this;
    await this.init();

    const moduleHelper = new ModuleHelper()
      .withDirectory(this._cwd)
      .withBuildDir(this._buildDir)
      .withModulePaths(this._modulePaths)
      .withLogger(this._logger);

    await moduleHelper.init();
    await moduleHelper.ensureModules(this._required);
    this._modulePaths = moduleHelper.modulePaths;

    // prepare script infos
    const myfiles = this._files.reduce((a, f) => [...a, ...glob.sync(f, {
      cwd: this._sourceRoot,
    })], []);
    const actionInfos = {};
    myfiles.forEach((f) => {
      const file = path.resolve(this._sourceRoot, f);
      const basename = path.basename(file);
      const idx = basename.lastIndexOf('.');
      if (idx > 0) {
        const name = basename.substring(0, idx);
        const ext = basename.substring(idx + 1);
        const idx1 = name.lastIndexOf('_');
        const type = idx1 < 0 ? name : name.substring(idx1 + 1);
        const cgi = ext === 'js' && file.indexOf(CGI_PAT) > 0;
        const actionName = cgi ? `cgi-bin-${name}` : name;
        if (ext === 'htl' || ext === 'jsx' || Builder.isScript(basename) || cgi) {
          if (actionInfos[actionName]) {
            const relPath = path.relative(this._cwd, actionInfos[actionName].entryFile);
            throw Error(`Unable to process '${f}': Action with name '${actionName}' already exists for '${relPath}'.`);
          }
          const relDir = path.relative(this._sourceRoot, path.dirname(file));
          const buildDir = path.resolve(this._buildDir, relDir);
          actionInfos[actionName] = {
            name: actionName,
            type: ext,
            contentType: type,
            cgi,
            entryFile: file,
            main: cgi ? file : path.resolve(buildDir, `${actionName}.js`),
            buildDir,
            infoFile: path.resolve(buildDir, `${actionName}.info.json`),
          };
        }
      }
    });

    // check for pre.js and pipe.js
    await Promise.all(Object.values(actionInfos).map(async (info) => {
      // cgi has never a pre or pipe.
      if (info.cgi) {
        return;
      }
      const dir = path.dirname(info.entryFile);
      const preName = path.resolve(dir, `${info.name}.pre.js`);
      if (await fse.pathExists(preName)) {
        info.pre = path.relative(info.buildDir, preName);
      } else {
        info.pre = this.getFallbackPreprocessor(`@adobe/helix-pipeline/src/defaults/${info.contentType}.pre.js`);
      }
      const pipeName = path.resolve(dir, `${info.name}.pipe.js`);
      if (await fse.pathExists(pipeName)) {
        // eslint-disable-next-line no-param-reassign
        info.pipe = path.relative(info.buildDir, pipeName);
      } else {
        info.pipe = this.getFallbackPreprocessor(`@adobe/helix-pipeline/src/defaults/${info.contentType}.pipe.js`);
      }
    }));

    // compile, generate scripts
    await Promise.all(Object.values(actionInfos).map(async (info) => {
      await fse.ensureDir(info.buildDir);
      // skip cgi
      if (info.cgi) {
        return;
      }
      if (info.type === 'htl') {
        await this.compileHtl(info);
      } else if (info.type === 'jsx') {
        await this.compileJsx(info);
      } else {
        info.scriptFile = info.entryFile;
      }
      await this.generateScript(info);
    }));

    // write info files
    await Promise.all(Object.values(actionInfos).map(async (info) => {
      await fse.writeFile(info.infoFile, JSON.stringify(info, null, 2), 'utf-8');
    }));

    if (!this._showReport) {
      return;
    }

    // show build report
    await Promise.all(Object.values(actionInfos).map(async (info) => {
      const entry = path.relative(this._cwd, path.resolve(info.buildDir, info.entryFile));
      log.info(chalk`{blueBright ${info.name}} ({yellow ${entry}})`);
      const main = path.relative(this._cwd, path.resolve(info.buildDir, info.main));
      log.debug(chalk`    {grey main}: ${main}`);
      if (info.scriptFile) {
        const script = path.relative(this._cwd, path.resolve(info.buildDir, info.scriptFile));
        log.debug(chalk`  {grey script}: ${script}`);
      }
      if (info.pre) {
        let { pre } = info;
        if (!pre.startsWith('@adobe')) {
          pre = path.relative(this._cwd, path.resolve(info.buildDir, info.pre));
        }
        log.debug(chalk`     {grey pre}: ${pre}`);
      }
      if (info.pipe) {
        let { pipe } = info;
        if (!pipe.startsWith('@adobe')) {
          pipe = path.relative(this._cwd, path.resolve(info.buildDir, info.pipe));
        }
        log.debug(chalk`    {grey pipe}: ${pipe}`);
      }
    }));
  }
}

module.exports = Builder;
