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
 * Returns true if the strain is a proxy strain
 * @param {Strain} strain
 */
function isproxy(strain) {
  return !!strain
  && ((strain.isProxy && strain.isProxy())
    || (strain.name
    && strain.origin
    && typeof strain.origin === 'object'));
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
  if (mystrain.origin) {
    mystrain.code = undefined;
    mystrain.index = undefined;
    mystrain.type = 'proxy';
  } else if (mystrain.code) {
    const match = mystrain.code.match(/^\/?([^/]+)\/?([^/]*)\/([^/]+)$/);
    if (match) {
      const ns = match[2] === '' ? 'default' : match[2];
      mystrain.code = `/${match[1]}/${ns}/${match[3]}`;
      mystrain.type = 'helix';
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
    // conditions for a normal strain
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
  ) || (
    // conditions for a proxy strain
    isproxy(strain)
  );
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

/** Filters the list of strains for proxy strains */
function proxies(strains) {
  if (Array.isArray(strains)) {
    return strains.filter(isproxy);
  } if (typeof strains === 'object' && strains instanceof Map) {
    return Array.from(strains.values()).filter(isproxy);
  }
  return [];
}

function addbackends(strains = [], backends = {}) {
  return proxies(strains)
    .map(({ origin }) => origin)
    .reduce((bes, be) => {
      const newbackends = bes;
      if (be.toJSON) {
        newbackends[be.name] = be.toJSON();
      } else {
        newbackends[be.name] = be;
      }
      return newbackends;
    }, backends);
}

module.exports = {
  load,
  name,
  append,
  proxies,
  addbackends,
};
