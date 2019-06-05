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

function wrapNodes(newparent, elems) {
  elems.forEach((el, index) => {
    newparent.appendChild(el.cloneNode(true));
    if (index !== 0) {
      el.parentNode.removeChild(el);
    } else {
      el.parentNode.replaceChild(newparent, el);
    }
  });
}

/**
 * The 'pre' function that is executed before the HTML is rendered
 * @param context The current context of processing pipeline
 * @param context.content The content
 */
function pre(context) {
  const document = context.content.document;

  /* workaround until sections in document are fixed via PR on pipeline */
  let currentCollection = [];
  let sections = [];

  document.body.childNodes.forEach((child) => {
    if (child.tagName === "HR") {
      sections.push(currentCollection);
      currentCollection = [];
    } else {
      currentCollection.push(child);
    }
  });

  sections.push(currentCollection);
  sections.forEach((el) => {
    const newparent = document.createElement("div");
    newparent.setAttribute('class', 'section');
    wrapNodes(newparent, el);
  });

  document.querySelectorAll("body>hr").forEach((el) => {
    el.parentNode.removeChild(el)
  });
  /* end of workaround */

}

module.exports.pre = pre;
