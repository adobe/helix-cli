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

const Asset = require('parcel-bundler/src/Asset');
const fs = require('fs');
const path = require('path');
const logger = require('@parcel/logger');
const { SourceMapConsumer, SourceMapGenerator } = require('source-map');
const resolver = require('./resolver');

const DEFAULT_PIPELINE = '@adobe/helix-pipeline/src/defaults/default.js';

const OUTPUT_TEMPLATE = path.resolve(__dirname, 'OutputTemplate.js');

/**
 * Parcel Asset that handles the internal 'helix-js' type. It wraps the simple template transforming
 * JS into an openwhisk action, using the {@code OUTPUT_TEMPLATE}.
 */
class HelixAsset extends Asset {
  constructor(name, options) {
    super(name, options);
    this.type = 'js';

    this.rendition = options.rendition;
    this.sourceMap = this.rendition ? this.rendition.sourceMap : null;
  }

  async generate() {
    const rootname = this.name.replace(/\.[^.]+$/, '');
    const extension = resolver.extension(this.basename);

    const pipe = this.getPreprocessor(
      `${rootname}.pipe.js`,
      `@adobe/helix-pipeline/src/defaults/${extension}.pipe.js`,
    );
    const pre = this.getPreprocessor(
      `${rootname}.pre.js`,
      `@adobe/helix-pipeline/src/defaults/${extension}.pre.js`,
    );

    let body = fs.readFileSync(OUTPUT_TEMPLATE, 'utf-8');
    if (this.sourceMap) {
      const index = body.search(/^\s*\/\/\s*CONTENTS\s*$/m);
      const lineOffset = index !== -1 ? body.substring(0, index).match(/\n/g).length + 1 : 0;

      this.sourceMap = await HelixAsset.shiftSourceMap(this.sourceMap, lineOffset);
    }
    body = body.replace(/^\s*\/\/\s*CONTENTS\s*$/m, `\n${this.contents}`);
    body = body.replace(/MOD_PIPE/, pipe);
    body = body.replace(/MOD_PRE/, pre);
    return [{
      type: 'helix-pre-js',
      value: body,
      sourceMap: this.sourceMap,
    }];
  }

  getPreprocessor(name, fallback) {
    if (fs.existsSync(name)) {
      // ensure forward slashes (windows)
      return path.relative(this.name, name).substr(1).replace(/\\/g, '/');
    }
    try {
      if (require.resolve(fallback)) {
        return fallback;
      }
    } catch (e) {
      logger.log(`${fallback} cannot be found, using default pipeline`);
    }

    return DEFAULT_PIPELINE;
  }

  /**
   * Shift the lines in a source map by some offset.
   *
   * @param {Object} sourceMap source map
   * @param {Number} lineOffset line offset
   * @returns shifted source map
   */
  static async shiftSourceMap(sourceMap, lineOffset) {
    const generator = new SourceMapGenerator({
      file: sourceMap.file,
      sourceRoot: sourceMap.sourceRoot,
    });

    // need to detour to string version. we can't use parcel's internal sourcemap here.
    const srcMap = sourceMap.version ? sourceMap : sourceMap.stringify();

    await SourceMapConsumer.with(srcMap, null, (consumer) => {
      consumer.eachMapping((m) => {
        generator.addMapping({
          source: m.source,
          name: m.name,
          original: { line: m.originalLine, column: m.originalColumn },
          generated: { line: m.generatedLine + lineOffset, column: m.generatedColumn },
        });
      });
    });
    const shiftedSourceMap = generator.toJSON();
    shiftedSourceMap.sourcesContent = sourceMap.sourcesContent;
    return shiftedSourceMap;
  }
}

module.exports = HelixAsset;
