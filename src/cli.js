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
const camelcase = require('camelcase');

const MIN_MSG = 'You need at least one command.';

// fix for #189: strip debug options from NODE_OPTIONS env variable
if (process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = process.env.NODE_OPTIONS
    .split(' ')
    .filter(opt => opt.indexOf('--inspect') === -1)
    .join(' ');
}

function envAwareStrict(args, aliases) {
  const specialKeys = ['$0', '--', '_'];
  const illegalEnv = ['saveConfig', 'add', 'default'];

  const hlxEnv = {};
  Object
    .keys(process.env)
    .filter(key => key.startsWith('HLX_'))
    .forEach((key) => {
      hlxEnv[camelcase(key.substring(4))] = key;
    });

  illegalEnv.forEach((key) => {
    if (key in hlxEnv) {
      throw new Error(`${hlxEnv[key]} is not allowed in environment.`);
    }
  });

  const unknown = [];
  Object.keys(args).forEach((key) => {
    if (specialKeys.indexOf(key) === -1 && !(key in hlxEnv) && !(key in aliases)) {
      unknown.push(key);
    }
  });

  if (unknown.length > 0) {
    return unknown.length === 1 ? `Unknown argument: ${unknown[0]}` : `Unknown arguments: ${unknown.join(', ')}`;
  }
  return true;
}

/**
 * Adds the default logging options.
 * @param argv Yargs
 * @returns {Yargs} the args
 */
function logArgs(argv) {
  return argv
    .option('log-file', {
      alias: 'logFile',
      describe: 'Log file (use "-" for stdout)',
      type: 'string',
      array: true,
      default: '-',
    })
    .option('log-level', {
      alias: 'logLevel',
      describe: 'Log level',
      type: 'string',
      choices: ['silly', 'debug', 'verbose', 'info', 'warn', 'error'],
      default: 'info',
    });
}

class CLI {
  constructor() {
    this._commands = {
      demo: require('./demo.js')(),
      up: require('./up.js')(),
      build: require('./build.js')(),
      package: require('./package.js')(),
      deploy: require('./deploy.js')(),
      perf: require('./perf.js')(),
      publish: require('./publish.js')(),
      clean: require('./clean.js')(),
      auth: require('./auth.js')(),
      hack: require('./hack.js')(),
    };
    this._failFn = (message, err, argv) => {
      const msg = err && err.message ? err.message : message;
      if (msg) {
        console.error(msg);
      }
      if (msg === MIN_MSG || /.*Unknown argument.*/.test(msg) || /.*Not enough non-option arguments:.*/.test(msg)) {
        console.error('\n%s', argv.help());
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

    const ret = logArgs(argv)
      .scriptName('hlx')
      .usage('Usage: $0 <command> [options]')
      .parserConfiguration({ 'camel-case-expansion': false })
      .env('HLX')
      .check(envAwareStrict)
      .showHelpOnFail(true)
      .fail(this._failFn)
      .exitProcess(args.indexOf('--get-yargs-completions') > -1)
      .demandCommand(1, MIN_MSG)
      .epilogue('for more information, find our manual at https://github.com/adobe/helix-cli')
      .help()
      .completion()
      .parse(args);

    // hack to check if command is valid in non-strict mode
    const cmd = ret._[0];
    if (cmd && !(cmd in this._commands)) {
      console.error('Unknown command: %s\n', cmd);
      argv.showHelp();
      process.exit(1);
    }
  }
}

module.exports = CLI;
