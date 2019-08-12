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

/**
 * recursively pulls up the dependencies of the scripts and returns the root scripts that are not
 * required by something else.
 * @param {Object[]} infos script infos
 * @return {Object[]} script infos
 */
function flattenDependencies(infos) {
  const lookup = {};
  infos.forEach((info) => {
    lookup[info.main] = info;
  });

  /**
   * Recursively resolves the dependencies.
   * @param script script info
   * @returns {string[]} Array of dependencies
   */
  function getDependencies(script, chain) {
    if (script.processed) {
      return script.requires;
    }
    const deps = {};
    script.requires.forEach((dep) => {
      deps[dep] = true;
      const info = lookup[dep];
      if (info) {
        chain.push(dep);
        if (chain[0] === dep) {
          throw Error(`Cyclic dependency detected: ${chain.join(' -> ')}`);
        }
        getDependencies(info, chain).forEach((d) => {
          deps[d] = true;
        });
        chain.pop();
        info.processed = true;
      } else {
        throw Error(`internal dependency from ${script.main} to ${dep} not found`);
      }
    });
    // eslint-disable-next-line
    script.requires = Object.keys(deps);
    return script.requires;
  }

  // resolve all deps
  infos.forEach((script) => {
    getDependencies(script, [script.main]);
  });

  // return the top level ones
  return infos.filter((info) => !info.processed);
}

module.exports = {
  flattenDependencies,
};
