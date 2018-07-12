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
const strainconfig = require('../src/strain-config-utils');

describe('Strain Config', () => {
  const config = `
# these are all the strains that get deployed to production
- strain:
    content:
      owner: trieloff
      repo: soupdemo
      ref: master
      root: moscow
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
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

  const unsorted = `
# these are all the strains that get deployed to production
- strain:
    name: xdm4
    content:
      owner: trieloff
      repo: soupdemo
      ref: test
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    name: xdm5
    content:
      owner: trieloff
      repo: soupdemo
      ref: test
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    name: xdm3
    content:
      owner: trieloff
      repo: soupdemo
      ref: test
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    name: xdmfoo
    content:
      owner: trieloff
      repo: soupdemo
      ref: foo
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    name: xdm
    content:
      owner: trieloff
      repo: soupdemo
      ref: master
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    name: xdm2
    content:
      owner: trieloff
      repo: soupdemo
      ref: branch
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    name: default
    content:
      owner: trieloff
      repo: soupdemo
      ref: master
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    content:
      owner: trieloff
      repo: soupdemo
      ref: master-one
      root: moscow
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    content:
      owner: trieloff
      repo: soupdemo
      ref: master-1
      root: moscow
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    content:
      owner: trieloff
      repo: soupdemo
      ref: master-2
      root: moscow
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    content:
      owner: trieloff
      repo: soupdemo
      ref: master-3
      root: moscow
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    content:
      owner: trieloff
      repo: soupdemo
      ref: master-4
      root: moscow
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    content:
      owner: trieloff
      repo: soupdemo
      ref: master-5
      root: moscow
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    content:
      owner: trieloff
      repo: soupdemo
      ref: master-6
      root: moscow
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    content:
      owner: trieloff
      repo: soupdemo
      ref: master-7
      root: moscow
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    content:
      owner: trieloff
      repo: soupdemo
      ref: master-8
      root: moscow
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    content:
      owner: trieloff
      repo: soupdemo
      ref: master-9
      root: moscow
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
- strain:
    content:
      owner: trieloff
      repo: soupdemo
      ref: master
      root: moscow
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty
`;

  const result = `- strain:
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
    name: bbed5838db880907
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

  it('Can be saved as YAML', () => {
    assert.equal(strainconfig.write(strainconfig.load(result)), result);
  });

  it('Strains get sorted in the right way', () => {
    const sorted = strainconfig.load(strainconfig.write(strainconfig.load(unsorted)));
    assert.equal('default', sorted[0].name);
  });

  it('New strains can be appended', () => {
    const mystrains = strainconfig.load(config);
    const newstrains = strainconfig.append(
      strainconfig.append(mystrains, {
        name: 'xdm-address',
        content: { owner: 'adobe', repo: 'xdm', ref: 'address' },
      }),
      { content: { owner: 'adobe', repo: 'xdm', ref: 'appendanother' } },
    );
    assert.equal(newstrains.length, 5);
  });

  it('New strains override existing strains with same name', () => {
    const mystrains = strainconfig.load(config);
    const newstrains = strainconfig.append(mystrains, {
      name: 'xdm',
      content: { owner: 'adobe', repo: 'xdm', ref: 'address' },
    });
    assert.equal(newstrains.length, 3);
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
