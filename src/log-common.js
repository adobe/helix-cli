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

const stream = require('stream');
const winston = require('winston');
const uuidv4 = require('uuid/v4');
const { Logger } = require('@adobe/helix-shared');

function makeLogger({ logLevel = 'info', logFile = ['-'] } = {}) {
  return Logger.getLogger({
    category: 'cli',
    logFile,
    level: logLevel,
  });
}

class StringStream extends stream.Writable {
  constructor() {
    super();
    this.data = '';
  }

  _write(chunk, enc, next) {
    this.data += chunk.toString();
    next();
  }
}

function makeTestLogger() {
  const logger = Logger.getLogger({
    category: uuidv4(),
    logFile: ['-'],
    level: 'info',
  });
  const s = new StringStream();

  logger.add(new winston.transports.Stream({
    stream: s,
    format: winston.format.simple(),
  }));

  const finishPromise = new Promise((resolve) => {
    logger.on('finish', () => {
      resolve(s.data);
    });
  });

  logger.getOutput = async () => {
    logger.end();
    return finishPromise;
  };

  return logger;
}

module.exports = {
  makeLogger,
  makeTestLogger,
};
