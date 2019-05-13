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

/**
 * The 'pre' function that is executed before the HTML is rendered
 * @param context The current context of processing pipeline
 * @param context.content The content
 * @return the new context
 */
function pre(context) {
  const mycontext = JSON.parse(JSON.stringify(context));
  context.content.foo = 'testing - should be ignored';

  mycontext.content.foo = 'bar';
  return mycontext;
}

module.exports.pre = pre;
