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

const fse = require('fs-extra');
const { dirname } = require('path');
const $ = require('shelljs');

const NODE_MODULES_LOCATION = 'node_modules';
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

function installDependency(depName, cwd) {
  console.log(`Installing dependency ${depName}`);

  const out = $.exec(`npm install ${depName}`, {
    silent: false,
    async: false,
    cwd,
  });

  // console.debug('Linking output:', out.stdout);

  if (out.stderr && out.stderr !== '') {
    console.error('Installing stderr:', out.stderr);
  }
}

function listModules(path) {
  const modules = [];

  if (!fse.existsSync(path)) return modules;

  const files = fse.readdirSync(path);

  files.forEach((file) => {
    const modPath = `${path}/${file}`;
    const stat = fse.statSync(modPath);
    if (stat.isDirectory()) {
      modules.push({
        path: modPath,
        name: file,
      });
    }
  });

  return modules;
}

function installAsGitDependency(mod, branch, cwd) {
  const dep = `github:${ADOBE_ORG}/${mod.name}#${branch}`;
  installDependency(dep, cwd);
}

function link(source, target, cwd) {
  console.log(`Linking ${source} as ${target} in ${cwd}`);

  const out = $.exec(`ln -s ${source} ${target}`, {
    silent: false,
    async: false,
    cwd,
  });

  // console.debug('Linking output:', out.stdout);

  if (out.stderr && out.stderr !== '') {
    console.error('Linking stderr:', out.stderr);
  }
}

function start() {
  const helixCliPath = process.env.GDM_HELIX_CLI_PATH || process.cwd();

  // 1. install helix-cli
  // (should be current folder otherwise specified by GDM_HELIX_CLI_PATH env variable)
  console.log(`Installing helix-cli located in ${helixCliPath}`);
  install({
    name: 'helix-cli',
    path: helixCliPath,
  });

  // 2. find list of all @adobe modules
  console.debug();
  console.debug(`Look for all ${ADOBE_MODULES} modules`);
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
    console.debug();
    console.debug(`Found module ${mod.name} that needs to be installed from git`);
    installAsGitDependency(mod, branches[mod.name] || 'master', helixCliPath);
  });

  // 4. find dependencies of dependencies (subdep) and set as link (might need a clone first)
  modules.forEach((mod) => {
    const sub = listModules(`${mod.path}/${NODE_MODULES_LOCATION}/${ADOBE_MODULES}`);
    sub.forEach(async (subdep) => {
      console.debug();
      console.debug(`Found a subdep in ${mod.name}: ${subdep.path}`);

      console.debug(`Deleting ${subdep.path}`);
      // delete subsub to link it afterward
      await fse.remove(subdep.path);

      // if dep is missing in helix-cli then install it
      const pathInParent = `${helixCliPath}/${NODE_MODULES_LOCATION}/${ADOBE_MODULES}/${subdep.name}`;
      if (!fse.existsSync(pathInParent)) {
        console.debug(`subdep ${mod.path} does not exist parent. Installing it as a git dependency in ${pathInParent}`);
        installAsGitDependency(subdep, branches[mod.name] || 'master', helixCliPath);
      }

      // finally, link it in the subdep
      link(pathInParent, subdep.name, `${helixCliPath}/${dirname(subdep.path)}`);
    });
  });

  console.log('Done.');
}

start();
