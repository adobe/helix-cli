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
/* global it, describe */
const assert = require('assert');
const winston = require('winston');
const wrapper = require('../src/openwhisk/wrapper.js');

describe('Test wrapper.js', () => {
  it('Wrapper can be loaded', () => {
    assert.ok(wrapper);
  });

  it('Wrapper is a function', () => {
    assert.equal(typeof wrapper, 'function');
  });

  it('Wrapping executes immediately', (done) => {
    assert.ok(wrapper(() => {
      done();
      return true;
    }));
  });

  it('Wrapping passes parameters', (done) => {
    assert.ok(wrapper(
      (p) => {
        assert.ok(p.hello);
        done();
        return true;
      },
      { hello: 'world' },
    ));
  });

  it('Wrapping masks secret parameters', (done) => {
    assert.ok(wrapper(
      (p) => {
        assert.notEqual(p.HELLO, 'world');
        done();
        return true;
      },
      { HELLO: 'world' },
    ));
  });

  it('Wrapping passes secret parameters as secrets', (done) => {
    assert.ok(wrapper(
      (p, s) => {
        assert.notEqual(p.HELLO, 'world');
        assert.equal(s.HELLO, 'world');
        done();
        return true;
      },
      { HELLO: 'world' },
    ));
  });

  it('Wrapping enables overriding of secret parameters', (done) => {
    assert.ok(wrapper(
      (p, s) => {
        assert.notEqual(s.HELLO, 'world');
        assert.equal(s.HELLO, 'just kidding');
        done();
        return true;
      },
      { HELLO: 'world' },
      { HELLO: 'just kidding' },
    ));
  });

  it('Wrapping sets up a logger with one transports', (done) => {
    assert.ok(wrapper(
      (p, s, l) => {
        assert.ok(l);
        assert.equal(l.level, 'debug', 'Incorrect log level');
        done();
        return true;
      },
      { HELLO: 'world' },
      { HELLO: 'just kidding' },
    ));
  });

  it('Wrapping passes the provided logger', (done) => {
    /* eslint-disable-next-line global-require */
    const mylogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.simple(),
      ),
      transports: [new winston.transports.Console()],
    });

    assert.ok(wrapper(
      (p, s, l) => {
        assert.ok(l);
        assert.strictEqual(l, mylogger);
        //


        l.info('She comes in colors ev\'rywhere');
        l.warn('She combs her hair');
        l.error('She\'s like a rainbow');
        done();
        return true;
      },
      { HELLO: 'world' },
      { HELLO: 'just kidding' },
      mylogger,
    ));
  });

  it('Spreading args works', (done) => {
    let counter = 0;

    const functiontorun = (params, secrets, logger) => {
      counter += 1;
      assert.equal(counter, 2);
      assert.ok(logger);
      assert.equal(params.hey, 'ho');
      done();
    };
    /* eslint-disable-next-line global-require */
    const wrapped = (...args) => wrapper(functiontorun, ...args);

    assert.ok(wrapped);
    assert.equal(typeof wrapped, 'function');

    counter += 1;
    assert.equal(counter, 1);
    wrapped({ hey: 'ho' });
  });
});
