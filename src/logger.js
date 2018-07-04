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

'use strict';

const path = require('path');
const winston = require('winston');

// module-global winston logger instance
const logger = winston.createLogger();

function configure(config) {
  const level = (config && config.level) || 'debug';

  const logsDir = path.normalize((config && config.logsDir) || 'logs');
  const logsFile = path.join(logsDir, 'hlx-server.log');

  logger.configure({
    transports: [
      new winston.transports.Console({
        level,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(info => `[hlx] ${info.level}: ${info.message}`),
        ),
      }),

      new winston.transports.File({
        level,
        filename: logsFile,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
        ),
      }),
    ],
  });
}

// configure with defaults
configure();

module.exports = {
  configure,
  log: (...args) => logger.log(...args),
  debug: (...args) => logger.debug(...args),
  info: (...args) => logger.info(...args),
  warn: (...args) => logger.warn(...args),
  error: (...args) => logger.error(...args),
  silly: (...args) => logger.silly(...args),
};
