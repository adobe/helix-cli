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
const _ = require('lodash/fp');
const winston = require('winston');
const loggly = require('node-loggly-bulk');
const Transport = require('winston-transport');

/* eslint-disable no-underscore-dangle */

/* A super simple loggly transport for OpenWhisk */
class LogglyTransport extends Transport {
  constructor(options) {
    super(options);
    this.loggly = loggly.createClient(Object.assign(options, { bufferOptions: { size: 1 } }));
  }

  log(info, callback) {
    this.loggly.log(info, callback);
  }
}

/**
 * Returns true when k is likely the name of a secure key (i.e. in ALL_CAPS)
 * @param {String} k
 */
function secure(v, k) {
  return k.match(/^[A-Z0-9_]+$/);
}

function split(o) {
  return [_.pickBy(secure, o), _.pickBy(_.negate(secure), o)];
}

function loglevel(p = {}) {
  if (p.__ow_headers) {
    if (p.__ow_headers['X-Debug']) {
      // use the log level set in the `X-Debug` header
      return p.__ow_headers['X-Debug'];
    }
  }
  return 'debug';
}

function activationid() {
  return process.env.__OW_ACTIVATION_ID
    ? process.env.__OW_ACTIVATION_ID
    : 'debug';
}

function functionname() {
  return process.env.__OW_ACTION_NAME
    ? process.env.__OW_ACTION_NAME.replace(/\/.+\//, '')
    : 'debug';
}

function requestid(p = {}) {
  if (p.__ow_headers) {
    if (p.__ow_headers['X-CDN-Request-Id']) {
      return p.__ow_headers['X-CDN-Request-Id'];
    }
  }
  return 'debug';
}

function defaultlogger(p = {}, secrets = {}) {
  const token = secrets.LOGGLY_KEY || p.LOGGLY_KEY;
  const subdomain = secrets.LOGGLY_HOST || p.LOGGLY_HOST;
  const logger = winston.createLogger({
    level: loglevel(p),
  });
  if (token && subdomain) {
    const myloggly = new LogglyTransport({
      token,
      subdomain,
      tags: ['OpenWhisk', functionname(), activationid()],
      json: true,
    });
    logger.add(myloggly);
  } else {
    logger.add(new winston.transports.Console({
      json: false,
      format: winston.format.simple(),
    }));
  }
  return logger;
}

/**
 * Wraps a function f with proper logging, before and after.
 */
function wrap(
  f,
  passedparams,
  passedsecrets,
  logger = defaultlogger(passedparams, passedsecrets),
) {
  const [parsedsecrets, params] = split(passedparams);
  // allow overriding secrets
  const secrets = Object.assign(parsedsecrets, passedsecrets);

  logger.log('silly', 'before', {
    params,
    request: requestid(params),
    activation: activationid(),
    function: functionname(),
  });
  try {
    const retval = Promise.resolve(f(params, secrets, logger))
      .then((r) => {
        logger.log('silly', 'resolved', {
          result: r,
          request: requestid(params),
          activation: activationid(),
          function: functionname(),
        });
        return r;
      })
      .catch((e) => {
        logger.log('debug', 'error', {
          error: e,
          request: requestid(params),
          activation: activationid(),
          function: functionname(),
        });
        return e;
      });
    return retval;
  } catch (e) {
    logger.error(e.stack);
    return { error: e };
  }
}

module.exports = wrap;
