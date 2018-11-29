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
  const { OpenWhiskAction } = require('@adobe/helix-pipeline');
  const { pipe } = require('MOD_PIPE');
  const { pre } = require('MOD_PRE');

  const _isFunction = (fn) => !!(fn && fn.constructor && fn.call && fn.apply);

  // this gets called by openwhisk
  return async function wrapped(params) {
    function once(payload, action) {
      // calls the pre function and then the script's main.
      function invoker(next) {
        const ret = pre(payload, action);
        if (ret && _isFunction(ret.then)) {
          return ret.then((pp) => next(pp || payload, action));
        }
        return next(ret || payload, action);
      }
      return invoker(main).then(resobj => ({ response: resobj }));
    }
    return OpenWhiskAction.runPipeline(once, pipe, params);
  };
}

module.exports.main = wrap(module.exports.main);
