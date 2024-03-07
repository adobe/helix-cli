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
import yargs from 'yargs';
import camelcase from 'camelcase';
import path from 'path';
import chalk from 'chalk-template';
import { resetContext } from './fetch-utils.js';

const MIN_MSG = 'You need at least one command.';

function envAwareStrict(args, aliases) {
  const specialKeys = ['$0', '--', '_'];

  const hlxEnv = {};
  Object
    .keys(process.env)
    .forEach((key) => {
      if (key.startsWith('HLX_')) {
        throw new Error(chalk`{red warning:} The environment prefix "HLX_" is not supported anymore. Please use "AEM_" instead.`);
      }
      if (key.startsWith('AEM_')) {
        hlxEnv[camelcase(key.substring(4))] = key;
      }
    });
  // setting the AEM_NO_OPEN doesn't seem to set args.open to false automatically...
  if (args.noOpen) {
    // eslint-disable-next-line no-param-reassign
    args.open = false;
  }

  const unknown = [];
  Object.keys(args).forEach((key) => {
    if (specialKeys.indexOf(key) === -1 && !(key in hlxEnv) && !(key in aliases)) {
      unknown.push(key);
    }
  });

  if (unknown.length > 0) {
    return unknown.length === 1 ? `Unknown argument: ${unknown[0]}` : `Unknown arguments: ${unknown.join(', ')}`;
  }
  if (path.basename(process.argv[1]) === 'hlx') {
    return chalk`{red warning:} The "hlx" command is deprecated. Please use "aem" instead.`;
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

export default class CLI {
  constructor() {
    this._failFn = (message, err, argv) => {
      const msg = err && err.message ? err.message : message;
      if (msg) {
        // eslint-disable-next-line no-console
        console.error(msg);
      }
      if (msg === MIN_MSG || /.*Unknown argument.*/.test(msg) || /.*Not enough non-option arguments:.*/.test(msg)) {
        // eslint-disable-next-line no-console
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

  async initCommands() {
    if (!this._commands) {
      this._commands = {};
      for (const cmd of ['up', 'hack', 'import']) {
        if (!this._commands[cmd]) {
          // eslint-disable-next-line no-await-in-loop
          this._commands[cmd] = (await import(`./${cmd}.js`)).default();
        }
      }
    }
    return this;
  }

  async run(args) {
    await this.initCommands();
    const argv = yargs();
    Object.values(this._commands)
      .forEach((cmd) => argv.command(cmd));

    logArgs(argv)
      .strictCommands(true)
      .scriptName('aem')
      .usage('Usage: $0 <command> [options]')
      .parserConfiguration({ 'camel-case-expansion': false })
      .env('AEM_')
      .check((a) => envAwareStrict(a, argv.parsed.aliases))
      .showHelpOnFail(true)
      .fail(this._failFn)
      .exitProcess(args.indexOf('--get-yargs-completions') > -1)
      .demandCommand(1, MIN_MSG)
      .epilogue('use <command> --help to get command specific details.\n\nfor more information, find our manual at https://github.com/adobe/helix-cli')
      .help()
      .parse(args);

    // reset fetch connections so that process can terminate
    await resetContext();
  }
}
