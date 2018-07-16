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

/* eslint-disable global-require */

'use strict';

const yargs = require('yargs');

class CLI {
  constructor() {
    this._commands = {
      init: require('./init.js')(),
      up: require('./up.js')(),
      build: require('./build.js')(),
      deploy: require('./deploy.js')(),
      perf: require('./perf.js')(),
      strain: require('./strain.js')(),
    };
    this._failFn = null;
  }

  withCommandExecutor(name, exec) {
    this._commands[name].executor = exec;
    return this;
  }

  onFail(fn) {
    this._failFn = fn;
    return this;
  }

  run(args) {
    const argv = yargs()
      .env('HLX');
    Object.values(this._commands).forEach(cmd => argv.command(cmd));

    if (this._failFn) {
      argv.exitProcess(false);
      argv.fail(this._failFn);
    }

    return argv
      .demandCommand()
      .help()
      .parse(args);
  }
}

module.exports = CLI;
