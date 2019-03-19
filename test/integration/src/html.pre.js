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
const fs = require('fs');
const _ = require('lodash/fp');
const map = require('unist-util-map');
const { utils } = require('./helper.js');
const { utils2 } = require('./utils/another_helper.js');
const { utils3 } = require('./third_helper');

module.exports.pre = (payload, action) => {
  payload.content.time = new Date() + _.camelCase('hello world.');
  payload.content.pkg = fs.readFileSync('package.json');
  payload.content.stamp = utils.stamp() + utils2.stamp() + utils3.stamp();
  payload.resourcePath = action.request.params.path;
};

module.exports.before = {
  fetch: (payload) => {
    if (payload.request.path==='/404.html') {
      return {
        content: {
          body: 'This file does not exist.'
        }
      }
    }
  }
}

/**
 * Finds MDAST objects that look like this:
 * ```markdown
 * > [!NOTE]
 * > Content of the note
 * ```
 * and flags them.
 * @param {object} node an MDAST node
 */
function findnotes(node) {
  if (node && 
    node.type === 'blockquote' && 
    node.children && 
    node.children[0] && 
    node.children[0].children && 
    node.children[0].children[0] && 
    node.children[0].children[0].type === 'linkReference' &&
    node.children[0].children[0].identifier && 
    node.children[0].children[0].identifier.match(/![a-z]+/)) {
    // get the class name
    const classname = node.children[0].children[0].identifier.replace(/!/, 'admonition-');
    const title = node.children[0].children[0].identifier.replace(/!/, '');

    // overwrite the linkReference node
    node.children[0].children[0] = {
      type: "strong",
      children: [ { type:"text", value: title}]
    };

    

    // make sure the correct HTML gets generated
    node.data = {
      hName: 'div',
      hProperties: {
        'class': classname
      }
    };
    
    return node;
  }
  return node;
}

/**
 * Finds "Liquid Tags" as defined by Jekyll and turns them into embeds using a (ficticious)
 * embeds.project-helix.io service that could interpret them.
 * @param {*} node 
 */
function findliquid(node) {
  const re = /\{% (\w+) (.*) %\}/;

  if (node && node.type === 'paragraph' && node.children && node.children[0] && node.children[0].type === 'text' && node.children[0].value.match(re)) {
    const [_, tag, params] = node.children[0].value.match(re);
    node.children[0].type = "embed";
    node.children[0].url = `https://embeds.project-helix.io/${tag}?params=${encodeURIComponent(params)}`;
  }
  return node;
}

module.exports.after = {
  parse: (payload) => {
    const mdast = payload.content.mdast;

    return {
      content: {
        // we want to do two things here, so we run the compose function instead of
        // having one mega-function. map is unist-util-map and quite cool.
        mdast: map(mdast, _.compose(findnotes, findliquid))
      }
    }
  }
}
