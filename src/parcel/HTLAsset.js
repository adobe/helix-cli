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

const fs = require('fs-extra');
const path = require('path');
const Compiler = require('@adobe/htlengine/src/compiler/Compiler');
const Asset = require('parcel-bundler/src/Asset');

/**
 * Parcel asset that compiles the HTL script into a javascript function.
 */
class HTLAsset extends Asset {
  constructor(name, options) {
    super(name, options);
    this.type = 'js';
  }

  // eslint-disable-next-line class-methods-use-this
  async parse(code) {
    const template = await fs.readFile(path.resolve(__dirname, 'RuntimeTemplate.js'), 'utf-8');
    const compiler = new Compiler()
      .withOutputDirectory('')
      .includeRuntime(true)
      .withRuntimeVar('content')
      .withRuntimeVar('request')
      .withRuntimeVar('context')
      .withRuntimeVar('payload')
      .withRuntimeGlobalName('global')
      .withCodeTemplate(template)
      .withDefaultMarkupContext(null)
      .withSourceMap(true);

    return compiler.compile(code);
  }

  generate() {
    const { template, sourceMap } = this.ast;
    if (sourceMap) {
      sourceMap.sources = [this.relativeName];
      sourceMap.sourcesContent = [this.contents];
    }
    return [{
      type: 'helix-js',
      value: template,
      sourceMap,
    }];
  }
}

module.exports = HTLAsset;
