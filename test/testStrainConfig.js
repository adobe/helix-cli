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
const fs = require('fs-extra');
const path = require('path');
const { HelixConfig } = require('@adobe/helix-shared');
const strainconfig = require('../src/strain-config-utils');

const proxyfile = path.resolve(__dirname, 'fixtures/proxystrains.yaml');
const proxy = fs.readFileSync(proxyfile, 'utf-8');

describe('Strain Config', () => {
  const config = fs.readFileSync(path.resolve(__dirname, 'fixtures/config.yaml'), 'utf-8');

  const invalid = fs.readFileSync(path.resolve(__dirname, 'fixtures/invalid.yaml'), 'utf-8');

  it('config can be parsed', () => {
    assert.equal(3, strainconfig.load(config).length);
  });


  it('config with proxy strains can be parsed', async () => {
    const config = await new HelixConfig().withConfigPath(proxyfile).init();
    const mystrains = config.strains;

    assert.equal(Array.from(mystrains.entries()).length, 3);
  });

  it('invalid config does not throw errors', () => {
    assert.equal(2, strainconfig.load(invalid).length);
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

describe('Invalid values are rejected or fixed on the fly', () => {
  const buggy = fs.readFileSync(path.resolve(__dirname, 'fixtures/buggy.yaml'), 'utf-8');

  it('action names without a default path get a default path', () => {
    const mystrains = strainconfig.load(buggy);
    assert.equal('/trieloff/default/git-github-com-adobe-helix-cli-git--dirty', mystrains[0].code);
  });

  it('invalid code paths get ignored', () => {
    const mystrains = strainconfig.load(buggy);
    assert.equal(1, mystrains.length);
  });
});

describe('Appending works without errors', () => {
  it('Appending to an empty file works', () => {
    const oldstrains = strainconfig.load('');
    const strain = {
      code: '/foobar/default/local--foobar--dirty',
      content: {
        repo: 'foo',
        ref: 'master',
        owner: 'null',
      },
    };
    const newstrains = strainconfig.append(oldstrains, strain);
    assert.equal(1, newstrains.length);
  });

  it('Appending to an existing file works', () => {
    const config = fs.readFileSync(path.resolve(__dirname, 'fixtures/config.yaml'), 'utf-8');

    const oldstrains = strainconfig.load(config);
    const strain = {
      code: '/foobar/default/local--foobar--dirty',
      content: {
        repo: 'foo',
        ref: 'master',
        owner: 'null',
      },
    };
    const newstrains = strainconfig.append(oldstrains, strain);
    assert.equal(4, newstrains.length);
  });
});

describe('Understands Proxy Strains', () => {
  it('proxies() returns all proxy strains #unit', async () => {
    const config = await new HelixConfig().withConfigPath(proxyfile).init();
    const mystrains = config.strains;
    assert.equal(strainconfig.proxies(mystrains).length, 1);
  });

  it('addbackends() returns new backend definitions #unit', async () => {
    const config = await new HelixConfig().withConfigPath(proxyfile).init();
    const mystrains = config.strains;
    const mybackends = strainconfig.addbackends(mystrains);
    assert.deepEqual(Object.keys(mybackends), ['Proxy1921681001bcbe']);
    assert.deepEqual(strainconfig.addbackends(mystrains), {
      Proxy1921681001bcbe: {
        address: '192.168.100.1',
        between_bytes_timeout: 10000,
        connect_timeout: 1000,
        error_threshold: 0,
        first_byte_timeout: 15000,
        hostname: '192.168.100.1',
        max_conn: 200,
        name: 'Proxy1921681001bcbe',
        port: 4503,
        shield: 'iad-va-us',
        ssl_cert_hostname: '192.168.100.1',
        use_ssl: true,
        weight: 100,
      },
    });
  });

  it('addbackends() handles empty lists well #unit', () => {
    const mystrains = [];
    assert.deepStrictEqual(strainconfig.addbackends(mystrains), {
    });
  });

  it('addbackends() keeps existing backends in place #unit', () => {
    const mystrains = [];
    const backends = {
      foo: "I'm a backend",
    };
    assert.deepStrictEqual(strainconfig.addbackends(mystrains, backends), backends);
  });

  it('addbackends() does not overwrite backends #unit', async () => {
    const config = await new HelixConfig().withConfigPath(proxyfile).init();
    const mystrains = config.strains;

    const backends = {
      foo: "I'm a backend",
    };
    assert.deepStrictEqual(strainconfig.addbackends(mystrains, backends), {
      Proxy1921681001bcbe: {
        address: '192.168.100.1',
        between_bytes_timeout: 10000,
        connect_timeout: 1000,
        error_threshold: 0,
        first_byte_timeout: 15000,
        hostname: '192.168.100.1',
        max_conn: 200,
        name: 'Proxy1921681001bcbe',
        port: 4503,
        shield: 'iad-va-us',
        ssl_cert_hostname: '192.168.100.1',
        use_ssl: true,
        weight: 100,
      },
      foo: "I'm a backend",
    });
  });
});
