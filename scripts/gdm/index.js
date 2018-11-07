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
/* eslint-disable no-console */

'use strict';

const fs = require('fs');
const $ = require('shelljs');

const NODE_MODULES_LOCATION = './node_modules';
const ADOBE_MODULES = '@adobe';
const ADOBE_ORG = 'adobe';

function install(mod) {
  console.log(`Installing module ${mod.name}`);

  const out = $.exec('npm install', {
    silent: false,
    async: false,
    cwd: mod.path,
  });

  // console.debug('Linking output:', out.stdout);

  if (out.stderr && out.stderr !== '') {
    console.error('Installing stderr:', out.stderr);
  }
}

function installDependency(depName, path) {
  console.log(`Installing dependency ${depName}`);

  const out = $.exec(`npm install ${depName}`, {
    silent: false,
    async: false,
    cwd: path,
  });

  // console.debug('Linking output:', out.stdout);

  if (out.stderr && out.stderr !== '') {
    console.error('Installing stderr:', out.stderr);
  }
}

function listModules(path) {
  const files = fs.readdirSync(path);

  const modules = [];
  files.forEach((file) => {
    const modPath = `${path}/${file}`;
    const stat = fs.statSync(modPath);
    if (stat.isDirectory()) {
      console.log(`Found module ${modPath}`);
      modules.push({
        path: modPath,
        name: file,
      });
    }
  });

  return modules;
}


function start() {
  const helixCliPath = process.env.GDM_HELIX_CLI_PATH || process.cwd();

  // 1. install helix-cli
  // (should be current folder otherwise specified by GDM_HELIX_CLI_PATH env variable)
  install({
    name: 'helix-cli',
    path: helixCliPath,
  });

  // 2. find list of all @adobe modules
  console.log(`Look for ${ADOBE_MODULES} modules`);
  const modules = listModules(`${NODE_MODULES_LOCATION}/${ADOBE_MODULES}`);

  // 3. set npm dependencies as github modules + branch
  let branches = {};
  try {
    branches = JSON.parse(process.env.GDM_MODULE_BRANCHES || '{}');
  } catch (err) {
    console.error('Cannot read GDM_MODULE_BRANCHES variable', err);
  }
  modules.forEach((mod) => {
    // compute the git branch or use master
    const branch = branches[mod.name] || 'master';
    const dep = `github:${ADOBE_ORG}/${mod.name}#${branch}`;
    installDependency(dep, helixCliPath);
  });

  console.log('Done.');
}

start();
