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

const eno = require('enojs');
const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');

describe('Testing ENO Loader', () => {
  let config;

  beforeEach('Loads an eno document', () => {
    const doc = fs.readFileSync(path.resolve(__dirname, 'fixtures/example.eno')).toString();
    config = eno.parse(doc);
    assert.ok(config);
  });

  it('Has Mountpoints', () => {
    assert.ok(config.section('Mount Points'));
  });

  it('Has Strains', () => {
    assert.ok(config.section('Strains'));
  });

  it('Has default Strain', () => {
    assert.ok(config.section('Strains').section('default'));
  });

  it('Default strain has the right stuff', () => {
    const defaultstrain = config.section('Strains').section('default');
    assert.equal(defaultstrain.section('content').section('/').field('repo'), 'project-helix.io');
    assert.equal(defaultstrain.section('content').section('/cli').field('ref'), '1.0');
    assert.equal(defaultstrain.field('code'), '/trieloff/default/git-github-com-adobe-helix-cli-git--');
  });

  it('Develop strain has the right stuff', () => {
    const developstrain = config.section('Strains').section('develop');
    assert.equal(developstrain.section('content').section('/').field('repo'), 'project-helix.io');
    assert.equal(developstrain.section('content').section('/cli').field('ref'), '1.0');
    assert.equal(developstrain.field('code'), '/trieloff/default/git-github-com-adobe-helix-cli-git--dirty');
  });


  it('Local strain has the right stuff', () => {
    const localstrain = config.section('Strains').section('local');
    assert.equal(localstrain.section('content').section('/').field('repo'), 'localhost');
    assert.equal(localstrain.section('content').section('/cli').field('ref'), 'master');
    assert.equal(localstrain.field('code'), '/trieloff/default/git-github-com-adobe-helix-cli-git--dirty');
  });

  it('Has three strains', () => {
    assert.equal(config.section('Strains').elements().length, 3);
  });
});
