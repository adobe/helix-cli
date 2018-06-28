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

const path = require('path');

const fse = require('fs-extra');
const chalk = require('chalk');

const NAME_PARAM = 'name';
const DIR_PARAM = 'dir';

/* eslint no-console: off */

module.exports = {
  command: `init <${NAME_PARAM}> [${DIR_PARAM}]`,
  aliases: ['i'],
  desc: 'Initialize the project structure',
  builder: (yargs) => {
    yargs.positional(NAME_PARAM, {
      type: 'string',
      describe: 'Name of the project to initialize',
    })
      .positional(DIR_PARAM, {
        type: 'string',
        describe: 'Parent directory of new project',
        default: '.',
      });
  },
  handler: (argv) => {
    const projectDir = path.resolve(path.join(argv.dir, argv.name));
    fse.ensureDir(projectDir)
      .then(() => {
        console.log(chalk.green(`Successfully created ${projectDir}`));
      })
      .catch((err) => {
        console.error(chalk.red(err));
      });
    // TODO: implement
    console.log(chalk.green('Init'), argv.name, argv.dir);
  },
};
