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

const yaml = require('js-yaml');
const hash = require('object-hash');

/**
 * Determines if a strain name is auto-generated, i.e. for an anonymous strain.
 * @param {String} stname name of the strain
 * @returns true for anonymous strains
 */
function anon(stname) {
  return !!stname.match(/^[0-9a-f]{16}$/);
}
/**
 * Generates a strain name for unnamed strains by hashing the contents
 * @param {Object} strain the strain configuration
 */
function name(strain) {
  if (strain) {
    return hash.sha1(strain).substr(24);
  }
  return null;
}

/**
 * @typedef {Object} Content
 * @property {String} owner
 * @property {String} ref
 * @property {String} repo
 * @property {String} root the root path for all served documents
 */

/**
 * @typedef {Object} Strain
 * @property {String} name
 * @property {String} code
 * @property {Content} content
 */

/**
  * @typedef {Object} Wrapped
  * @property {Strain} strain
  */

/**
 * Each element in the YAML file should be a strain object underneath the strain key
 * This function extracts that strain object and cleans it by adding missing required
 * properties (such as name)
 * @param {Wrapped} strain the wrapped strain
 * @returns {Strain} the unwrapped strain
 */
function clean(strain) {
  const mystrain = strain;
  // clean up code
  if (mystrain.code) {
    const match = mystrain.code.match(/^\/?([^/]+)\/?([^/]*)\/([^/]+)$/);
    if (match) {
      const ns = match[2] === '' ? 'default' : match[2];
      mystrain.code = `/${match[1]}/${ns}/${match[3]}`;
    } else {
      // eslint-disable-next-line no-console
      console.error(`Strain ${mystrain.name} has invalid code defined`);
      mystrain.code = undefined;
    }
  } else {
    // eslint-disable-next-line no-console
    console.error(`Strain ${mystrain.name} has no code defined`);
  }

  return mystrain;
}

/**
 * Validates that all required properties are set for a loaded strain
 * @param {Strain} strain
 */
function validate(strain) {
  return (
    !!strain
    && strain.name
    && strain.content
    && strain.content.owner
    && strain.content.repo
    && strain.code
    && typeof strain.code === 'string'
    && typeof strain.content.owner === 'string'
    && typeof strain.content.repo === 'string'
    && strain.content.owner.match(/^[^/]+$/)
    && strain.content.repo.match(/^[^/]+$/)
  );
}

/**
 * Wraps a strain for writing into a YAML list
 * @param {Strain} strain
 * @returns {Wrapped}
 */
function wrap(strain) {
  return { strain };
}

/**
 * Helper function for sorting strains in the output file.
 * Desired order:
 * 1. default
 * 2. named strains (alphabetically)
 * 3. anonymous strains (alphabetically)
 * @param {Strain} straina
 * @param {Strain} strainb
 */
function compare(straina, strainb) {
  // default strain always comes first
  if (straina.strain.name === 'default') {
    return -1;
  }
  if (strainb.strain.name === 'default') {
    return 1;
  }
  // named strains come next
  const anona = anon(straina.strain.name);
  const anonb = anon(strainb.strain.name);
  if (anonb && !anona) {
    return -1;
  }
  if (anona && !anonb) {
    return 1;
  }
  return straina.strain.name.localeCompare(strainb.strain.name);
}

/**
 * Converts a list of strains into YAML
 * @param {Strain[]} strains
 * @returns {String} YAML
 */
function write(strains) {
  return yaml.safeDump(strains
    .map(wrap)
    .map(clean)
    .map(wrap)
    .sort(compare));
}

/**
 * Appends a strain to a list of known strains, avoiding duplicates
 * @param {Strain[]} strains
 * @param {Strain} strain
 */
function append(strains, strain) {
  if (strains.length === 0) {
    // this is the first strain we're adding
    return [Object.assign({ name: 'default', ...strain })];
  }
  if (!strain.name) {
    const newdefault = Object.assign({ name: 'default', ...strain });
    const olddefault = strains.length > 0 ? strains[0] : newdefault;
    if (hash.sha1(olddefault) === hash.sha1(newdefault)) {
      // this is a non-substantial update to the default, not appending
      return strains;
    }
  }
  const stname = strain.name || name(strain);
  const oldstrains = strains.filter(e => e.name !== stname);
  oldstrains.push(strain);
  return oldstrains;
}

/**
 * Loads a list of strains from a JSON or YAML string
 * @param {String} data
 * @returns {Strain[]} the loaded strains
 */
function load(data) {
  let obj;
  if (data.charAt(0) === '{') {
    obj = JSON.parse(data);
  } else {
    obj = yaml.safeLoad(data);
  }
  if (!obj) {
    return [];
  }
  // convert to array for easier operation
  return Object.keys(obj).map((key) => {
    obj[key].name = key;
    return obj[key];
  })
    .map(clean)
    .filter(validate);
}

module.exports = {
  load,
  name,
  write,
  append,
};
