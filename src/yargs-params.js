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

module.exports = function commonArgs(yargs, options) {
  return yargs
    .option(options.name, (() => {
      // Get rid of name as we already consumed it
      const optCopy = { ...options };
      delete optCopy.name;
      return optCopy;
    })())
    .coerce((options.name), (argv) => {
      // Check Length is Multiple of 2 these are KV pairs.
      const { length } = argv;
      if (length > 0 && length % 2 === 0) {
        return argv.reduce((p, c, i) => {
          if (i % 2 === 0) {
            // eslint-disable-next-line no-param-reassign
            p[c] = argv[i + 1];
          }
          return p;
        }, {});
      } else if (length) {
        throw new Error(`${options.name} needs an even number of parameters, think key-value pairs`);
      }
    });
};
