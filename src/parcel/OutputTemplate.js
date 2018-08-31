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

/* eslint-disable */

// CONTENTS

function wrap(main) {
  const { pipe } = require('MOD_PIPE');
  const { pre } = require('MOD_PRE');
  const owwrapper = require('@adobe/openwhisk-loggly-wrapper');

  const _isFunction = (fn) => !!(fn && fn.constructor && fn.call && fn.apply);

  // this gets called by openwhisk
  return function wrapped(payload, action = {}, logger) {
    const runthis = (p, a, l) => {
      const next = (p, a, l) => {
        function cont(next) {
          const config  = Object.assign({}, a, { logger: l });
          const ret = pre(p, config);
          if (ret && _isFunction(ret.then)) {
            return ret.then((pp) => next(pp || p, a, l));
          }
          return next(ret || p, a, l);
        }
        return cont(main).then(resobj => ({ response: resobj }));
      };
      return pipe(next, p, a, l);
    };
    return owwrapper(runthis, payload, action, logger);
  };
}

module.exports.main = wrap(module.exports.main);
