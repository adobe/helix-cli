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

const winston = require('winston');

const { format } = winston;

module.exports.logArgs = yargs => yargs
  .option('log-file', {
    describe: 'Log file (use - for stdout)',
    type: 'string',
    array: true,
    default: '-',
  })
  .option('log-level', {
    describe: 'Log level',
    type: 'string',
    choices: ['silly', 'debug', 'verbose', 'info', 'warn', 'error'],
    default: 'info',
  });

function makeTransport(filename) {
  const consoleformat = format.combine(
    format.colorize({ all: true }),
    format.simple(),
  );

  const fileformat = format.combine(
    format.timestamp(),
    format.align(),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
  );

  const jsonformat = format.combine(
    format.timestamp(),
    format.logstash(),
  );


  if (filename === '-' || filename === 'stdout') {
    return new winston.transports.Console({
      format: consoleformat,
    });
  } if (/\.json/.test(filename)) {
    return new winston.transports.File({ filename, format: jsonformat });
  }
  return new winston.transports.File({ filename, format: fileformat });
}

module.exports.makeLogger = function makeLogger({ logLevel = 'info', logFile = ['-'] }) {
  const logger = winston.createLogger({ level: logLevel, transports: logFile.map(makeTransport) });

  return logger;
};
