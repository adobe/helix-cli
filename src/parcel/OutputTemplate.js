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
  return function wrapped(params) {
    const runthis = (params) => {
      // create payload and action objects
      const secrets = {};
      const { __ow_headers, __ow_method, __ow_logger } = params;
      const disclosed = Object.assign({}, params);
      delete disclosed.__ow_headers; // todo: switch to test operator once parcel supports it
      delete disclosed.__ow_method;
      delete disclosed.__ow_logger;

      Object.keys(disclosed).forEach((key) => {
        if (key.match(/^[A-Z0-9_]+$/)) {
          secrets[key] = disclosed[key];
          delete disclosed[key];
        }
      });

      const action = {
        secrets,
        request: {
          params: disclosed,
          headers: __ow_headers,
          method: __ow_method,
        },
        logger: __ow_logger,
      };
      const payload = {
      };
      const next = (payload, action) => {
        function cont(next) {
          const ret = pre(payload, action);
          if (ret && _isFunction(ret.then)) {
            return ret.then((pp) => next(pp || payload, action));
          }
          return next(ret || payload, action);
        }
        return cont(main).then(resobj => ({ response: resobj }));
      };
      return pipe(next, payload, action);
    };

    // the owrapper adds logging to the params
    return owwrapper(runthis, params);
  };
}

module.exports.main = wrap(module.exports.main);
