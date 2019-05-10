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


/**
 * A component with a list of links found in the main content of the
 * rendered document. It will be shown as a `<footer>` tag, with a 
 * list of links and a heading.
 * @param {*} title 
 * @param {*} document 
 */
const LinkList = (title, document) => (
  <footer className="link-list">
    <h1>
      {document.querySelectorAll("a[href]").length} Links for {title}
    </h1>
    <ul>
      {[...document.querySelectorAll("a[href]")].map(link => (
        <li>{link}</li>
      ))}
    </ul>
  </footer>
);

/*
 * As JSX files are not templates per se, but an alternative syntax for JavaScript
 * that makes it easy to create DOM elements, you need to provide the correct entry
 * point, i.e. export a `main` function that acts on the `context`.
 */
module.exports.main = context => {
  return {
    response: {
      // the response body needs to be a string, so taking the `outerHTML` of
      // the topmost component is a good choice.
      body: LinkList(context.content.title, context.content.document).outerHTML
    }
  };
};
