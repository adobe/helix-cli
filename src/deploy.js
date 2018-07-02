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

const ow = require('openwhisk');
const $ = require('shelljs');
const glob = require('glob');
const path = require('path');
const fs = require('fs');

/* eslint no-console: off */

const rev = $
  .exec('git rev-parse HEAD', { silent: true })
  .stdout.replace(/\n/, '')
  .replace(/[\W]/g, '-');

const tag = $
  .exec(`git name-rev --tags --name-only ${rev}`, { silent: true })
  .stdout.replace(/\n/, '')
  .replace(/[\W]/g, '-');

const branchname = $
  .exec('git rev-parse --abbrev-ref HEAD', { silent: true })
  .stdout.replace(/\n/, '')
  .replace(/[\W]/g, '-');

const dirty = $
  .exec('git status --porcelain', { silent: true })
  .stdout.replace(/\n/, '')
  .replace(/[\W]/g, '-')
  .length;

const branch = tag !== 'undefined' ? tag : branchname;
const branchflag = dirty ? 'dirty' : branch;

const repo = $
  .exec('git config --get remote.origin.url', { silent: true })
  .stdout.replace(/\n/, '')
  .replace(/[\W]/g, '-');

module.exports = {
  command: 'deploy',
  aliases: ['d'],
  desc: 'Deploy packaged functions to Adobe I/O runtime',
  builder: (yargs) => {
    yargs
      .option('auto', {
        describe: 'Enable auto-deployment',
        type: 'boolean',
        default: true,
        demandOption: true,
      })
      .option('auth', {
        describe: 'Adobe I/O Runtime Authentication key',
        type: 'string',
      })
      .option('namespace', {
        describe: 'Adobe I/O Runtime Namespace',
        type: 'string',
        demandOption: true,
      })
      .option('apihost', {
        describe: 'Adobe I/O Runtime API Host',
        type: 'string',
        default: 'runtime.adobe.io',
      })
      .option('loghost', {
        describe: 'API Host for Log Appender',
        type: 'string',
        default: 'trieloff.loggly.com',
      })
      .option('logkey', {
        describe: 'API Key for Log Appender ($HLX_LOGKEY)',
        type: 'string',
        default: '',
      })
      .option('target', {
        alias: 'o',
        default: '.hlx/build',
        describe: 'Target directory for compiled JS',
      })
      .option('docker', {
        default: 'trieloff/custom-ow-nodejs8:latest',
        describe: 'Docker image for Adobe I/O Runtime function',
      })
      .option('prefix', {
        alias: 'p',
        default: `${repo}--${branchflag}--`,
        describe: 'Prefix for the deployed action name',
      })
      .option('default', {
        describe: 'Adds a default parameter to the function',
        type: 'string',
      })
      .option('dirty', {
        describe: 'Allows deploying a working copy with uncommitted changes (dangerous)',
        type: 'boolean',
        default: false,
      })
      .array('default')
      .nargs('default', 2)
      .coerce('default', arg => arg.reduce((result, value, index, array) => {
        const res = {};
        if (index % 2 === 0) {
          res[value.toUpperCase()] = array[index + 1];
        }
        return Object.assign(res, result);
      }, {}))
      .demandOption(
        'auth',
        'Authentication is required. You can pass the key via the HLX_AUTH environment variable, too',
      )
      .group(['auto', 'auth', 'namespace', 'default', 'dirty'], 'Deployment Options')
      .group(['apihost', 'loghost', 'logkey', 'target', 'docker', 'prefix'], 'Advanced Options:')
      .help();
  },
  handler: (argv) => {
    if (argv.auto) {
      console.error('Auto-deployment not implemented yet, please try hlx deploy --no-auto');
      process.exit(1);
    }
    if (dirty && !argv.dirty) {
      console.error('hlx will not deploy a working copy that has uncommitted changes. Re-run with flag --dirty to force.');
      process.exit(dirty);
    }

    const owoptions = { apihost: argv.apihost, api_key: argv.auth, namespace: argv.namespace };
    const openwhisk = ow(owoptions);

    const scripts = glob.sync(`${argv.target}/*.js`);

    const params = { ...argv.default, LOGGLY_HOST: argv.loghost, LOGGLY_KEY: argv.logkey };

    scripts.map((script) => {
      const name = argv.prefix + path.basename(script, '.js');
      console.log(`⏳  Deploying ${script} as ${name}`);

      fs.readFile(script, { encoding: 'utf8' }, (err, action) => {
        if (!err) {
          const actionoptions = {
            name,
            action,
            params,
            kind: 'blackbox',
            exec: { image: argv.docker },
            annotations: { 'web-export': true },
          };
          // console.log(actionoptions)
          openwhisk.actions.update(actionoptions).then((result) => {
            console.log(`✅  Action ${result.name} has been created.`);
          });
        }
      });

      return name;
    });
  },
};
