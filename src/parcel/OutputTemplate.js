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

const h = require('hyperscript');


// CONTENTS


function helix_wrap_action(main) {
  const { OpenWhiskAction } = require('@adobe/helix-pipeline');
  const { pipe } = require('MOD_PIPE');
  const { pre, before, after } = require('MOD_PRE');

  // this gets called by openwhisk
  return async function wrapped(params) {
    // this is the once function that will be installed in the pipeline
    async function once(payload, action) {
      // calls the pre function and then the script's main.
      async function invoker(next) {
        console.log('invoking', next);
        const ret = await Promise.resolve(pre(payload, action));
        return Promise.resolve(next(ret || payload, action));
      }
      return invoker(main);
    }

    if (before) {
      once.before = before;
    }
    if (after) {
      once.after = after;
    }

    return OpenWhiskAction.runPipeline(once, pipe, params);
  };
}

module.exports.main = helix_wrap_action(module.exports.main);
