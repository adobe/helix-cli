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

/* eslint-env mocha */

const assert = require('assert');
const strainconfig = require('../src/strain-config');

describe('Strain Config', () => {
  const config = `
# these are all the strains that get deployed to production
- strain:
    name: default
    content:
      owner: trieloff
      repo: soupdemo
      ref: master
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty

- strain:
    name: xdm
    condition: req.http.host == "xdm.primordialsoup.life"
    content:
      owner: adobe
      repo: xdm
      ref: master
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty

- strain:
    content:
      owner: trieloff
      repo: soupdemo
      ref: master
      root: moscow
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
`;

  const invalid = `
# these are all the strains that get deployed to production
- nostrain:
    name: default
    content:
      owner: trieloff
      repo: soupdemo
      ref: master
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty

- strain:
    name: xdm
    condition: req.http.host == "xdm.primordialsoup.life"
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty

- strain:
    content:
      owner: trieloff
      repo: soupdemo
      ref: master
      root: moscow
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
`;

  it('config can be parsed', () => {
    assert.equal(3, strainconfig.load(config).length);
  });

  it('invalid config does not throw errors', () => {
    assert.equal(1, strainconfig.load(invalid).length);
  });
});

describe('Generated names are stable', () => {
  it('name() generates stable IDs', () => {
    assert.deepEqual(
      strainconfig.name({
        content: { owner: 'foo', repo: 'bar' },
      }),
      strainconfig.name({
        content: { repo: 'bar', owner: 'foo' },
      }),
    );
  });
});
