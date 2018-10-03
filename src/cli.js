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

/* eslint-disable global-require, no-console */

'use strict';

const yargs = require('yargs');

const MIN_MSG = 'You need at least one command.';

// fix for #189: strip debug options from NODE_OPTIONS env variable
if (process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = process.env.NODE_OPTIONS
    .split(' ')
    .filter(opt => opt.indexOf('--inspect') === -1)
    .join(' ');
}

class CLI {
  constructor() {
    this._commands = {
      demo: require('./demo.js')(),
      up: require('./up.js')(),
      build: require('./build.js')(),
      deploy: require('./deploy.js')(),
      perf: require('./perf.js')(),
      strain: require('./strain.js')(),
      clean: require('./clean.js')(),
    };
    this._failFn = (message, err, argv) => {
      const msg = err ? err.message : message;
      console.error(msg);
      if (msg === MIN_MSG || /.*Unknown argument.*/.test(msg) || /.*Not enough non-option arguments:.*/.test(msg)) {
        console.error('\nUsage: %s', argv.help());
      }
      process.exit(1);
    };
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
    const argv = yargs();
    Object.values(this._commands).forEach(cmd => argv.command(cmd));

    return argv
      .fail(this._failFn)
      .exitProcess(false)
      .strict()
      .demandCommand(1, MIN_MSG)
      .epilogue('for more information, find our manual at https://github.com/adobe/helix-cli')
      .help()
      .parse(args);
  }
}

module.exports = CLI;
