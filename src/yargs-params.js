/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const path = require('path');
const fse = require('fs-extra');
const dotenv = require('dotenv');

/**
 * Decoded the params string. First as JSON and if this fails, as ENV format.
 *
 * @param {string} params Params string.
 * @param {string} cwd CWD of to resolve file, assumes that `param` is a file path.
 * @returns {*} Decoded params object.
 */
function decodeParamString(params, cwd = '') {
  let content = params.trim();
  if (cwd) {
    const filename = path.resolve(cwd, content);
    if (!fse.existsSync(filename)) {
      throw Error(`Specified param file does not exist: ${path.relative(process.cwd(), filename)}`);
    }
    content = fse.readFileSync(filename, 'utf-8').trim();
  }
  let data;
  if (content.startsWith('{')) {
    data = JSON.parse(content);
  } else {
    data = dotenv.parse(content);
  }
  return data;
}

/**
 * Decodes a file params.
 * @param {string[]} filenames Filename
 * @param {string} [cwd=process.cwd()] Current work directory.
 * @returns {*}
 */
function decodeFileParams(filenames, cwd = process.cwd()) {
  return filenames
    .reduce((prev, filename) => (Object.assign(prev, decodeParamString(filename, cwd))), {});
}

/**
 * Decodes a param array.
 * @param {string[]} values Param values.
 * @param {string} name Informational name of the option that is parsed.
 * @returns {{}|*}
 */
function decodeParams(values, name) {
  if (!values && values.length === 0) {
    return {};
  }
  if (values.length % 2 === 0) {
    return values.reduce((p, c, i) => {
      if (i % 2 === 0) {
        // eslint-disable-next-line no-param-reassign
        p[c] = values[i + 1];
      }
      return p;
    }, {});
  } else if (values.length === 1) {
    return decodeParamString(values[0]);
  } else {
    throw new Error(`${name} needs either a JSON string or key-value pairs`);
  }
}

module.exports = function commonArgs(yargs, options) {
  const fileOptions = {
    ...options,
    name: `${options.name}-file`,
    alias: options.alias ? `${options.alias}File` : `${options.name}File`,
    describe: `${options.describe} (JSON or env file)`,
  };
  return yargs
    .option(options.name, options)
    .coerce(options.name, (argv) => decodeParams(argv, options.name))
    .option(fileOptions.name, fileOptions)
    .coerce(fileOptions.name, (argv) => decodeFileParams.bind(decodeFileParams, argv));
};

// for testing
module.exports.decodeFileParams = decodeFileParams;
