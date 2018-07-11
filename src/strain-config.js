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


function anon(stname) {
  return !!stname.match(/^[0-9a-f]{16}$/);
}

function name(strain) {
  if (strain) {
    return hash.sha1(strain).substr(24);
  }
  return null;
}

function clean(strain) {
  if (strain.strain && strain.strain.name && !anon(strain.strain.name)) {
    return strain.strain;
  }
  return { name: name(strain.strain), ...strain.strain };
}

function validate(strain) {
  return (
    !!strain &&
    strain.name &&
    strain.content &&
    strain.content.owner &&
    strain.content.repo &&
    strain.code
  );
}

function wrap(strain) {
  return { strain };
}

function compare(straina, strainb) {
  // default strain always comes first
  if (straina.strain.name === 'default') {
    return -1;
  } else if (strainb.strain.name === 'default') {
    return 1;
  }
  // named strains come next
  const anona = anon(straina.strain.name);
  const anonb = anon(strainb.strain.name);
  if (anonb && !anona) {
    return -1;
  } else if (anona && !anonb) {
    return 1;
  }
  return straina.strain.name.localeCompare(strainb.strain.name);
}

function write(strains) {
  return yaml.safeDump(strains
    .map(wrap)
    .map(clean)
    .map(wrap)
    .sort(compare));
}

function append(strains, strain) {
  const stname = strain.name || name(strain);
  const oldstrains = strains.filter(e => e.name!==stname);
  oldstrains.push(strain);
  return oldstrains;
}

function load(yml) {
  return yaml
    .safeLoad(yml)
    .map(clean)
    .filter(validate);
}

module.exports = {
  load,
  name,
  write,
  append
};
