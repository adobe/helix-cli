// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

// eslint-disable-next-line no-global-assign
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  return newRequire;
})({"html.pre.js":[function(require,module,exports) {
/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
/* eslint-disable  */
module.exports.pre = payload => {
  payload.content.time = 'Thu Sep 06 2018 17:12:11 GMT+0900 (JST)';
};
},{}],"html.htl":[function(require,module,exports) {
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

const Runtime = require('@adobe/htlengine/src/runtime/Runtime');

function run(runtime) {
  const lengthOf = function (c) {
    return Array.isArray(c) ? c.length : Object.keys(c).length;
  };

  const out = runtime.out.bind(runtime);
  const exec = runtime.exec.bind(runtime);
  const xss = runtime.xss.bind(runtime);
  const listInfo = runtime.listInfo.bind(runtime);
  const use = runtime.use.bind(runtime);
  const slyResource = runtime.resource.bind(runtime);
  const call = runtime.call.bind(runtime);
  const template = runtime.template.bind(runtime);

  return runtime.run(function* () {
    let content = runtime.globals.content;
    let request = runtime.globals.request;
    const payload = runtime.globals;
    out("<!DOCTYPE html>\n<!--\n  ~ Licensed to the Apache Software Foundation (ASF) under one or more\n  ~ contributor license agreements.  See the NOTICE file distributed with\n  ~ this work for additional information regarding copyright ownership.\n  ~ The ASF licenses this file to You under the Apache License, Version 2.0\n  ~ (the \"License\"); you may not use this file except in compliance with\n  ~ the License.  You may obtain a copy of the License at\n  ~\n  ~      http://www.apache.org/licenses/LICENSE-2.0\n  ~\n  ~ Unless required by applicable law or agreed to in writing, software\n  ~ distributed under the License is distributed on an \"AS IS\" BASIS,\n  ~ WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n  ~ See the License for the specific language governing permissions and\n  ~ limitations under the License.\n  -->\n<html>\n<head>\n  <meta charset=\"utf-8\"></meta>\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></meta>\n  <title>");
    const var_0 = content["title"];
    out(var_0);
    out("</title>\n  <link rel=\"stylesheet\" href=\"/dist/styles.fbbbdc14.css\"></link>\n</head>\n<body>\n\n<h1>Lars was here</h1>\n");
    const var_collectionVar1 = content["children"];
    const var_size2 = lengthOf(var_collectionVar1);
    if (var_size2) {
      out("<div>");
      for (const var_index3 of Object.keys(var_collectionVar1)) {
        const item = Array.isArray(var_collectionVar1) ? var_collectionVar1[var_index3] : var_index3;
        const itemList = listInfo(var_index3, var_size2);
        out("\n  <div class=\"container-fluid\">");
        const var_4 = item;
        out(var_4);
        out("</div>\n");
      }
      out("</div>");
    }
    out("\n\n<div class=\"container-fluid\">\n  <em>");
    const var_5 = "generated at " + content["time"];
    out(var_5);
    out("</em>\n</div>\n\n</body>\n</html>\n");
  });
}

module.exports.main = function main(resource) {
  const runtime = new Runtime();
  runtime.setGlobal(resource);
  return run(runtime).then(() => ({ body: runtime.stream }));
};

function wrap(main) {
  const {
    OpenWhiskAction
  } = require('@adobe/hypermedia-pipeline');

  const {
    pipe
  } = require('@adobe/hypermedia-pipeline/src/defaults/html.pipe.js');

  const {
    pre
  } = require('./html.pre.js');

  const _isFunction = fn => !!(fn && fn.constructor && fn.call && fn.apply); // this gets called by openwhisk


  return async function wrapped(params) {
    function once(payload, action) {
      // calls the pre function and then the script's main.
      function invoker(next) {
        const ret = pre(payload, action);

        if (ret && _isFunction(ret.then)) {
          return ret.then(pp => next(pp || payload, action));
        }

        return next(ret || payload, action);
      }

      return invoker(main).then(resobj => ({
        response: resobj
      }));
    }

    return OpenWhiskAction.runPipeline(once, pipe, params);
  };
}


module.exports.main = wrap(module.exports.main);
},{"./static/styles.css":[["styles.fbbbdc14.css","static/styles.css"],"static/styles.css"],"./html.pre.js":"html.pre.js"}]},{},["html.htl"], null)
//# sourceMappingURL=/dist/html.map
