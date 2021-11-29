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
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk-template';
import {
  ConsoleLogger,
  FileLogger,
  messageFormatJsonString,
  messageFormatTechnical, MultiLogger,
  serializeMessage,
  SimpleInterface,
} from '@adobe/helix-log';

const LEVEL_NAMES = {
  info: chalk`{green info}`,
  warn: chalk`{yellow warn}`,
  error: chalk`{red error}`,
};

/**
 * Log message filter that removes log entries produced during a progress bar
 * (fields.progress === true), but only on a tty.
 */
const suppressProgress = (fields) => {
  // eslint-disable-next-line no-underscore-dangle,no-console
  if (fields.progress && console._stderr.isTTY) {
    return undefined;
  }
  // eslint-disable-next-line no-param-reassign
  delete fields.progress;
  return fields;
};

/**
 * Log message filter that removes the `progress` field so that it doesn't get logged.
 */
const filterProgress = (fields) => {
  // eslint-disable-next-line no-param-reassign
  delete fields.progress;
  return fields;
};

/**
 * Message format for the console that doesn't show the `info` level keyword for the `cli`
 * category. prefixes the log entries with the category otherwise.
 */
const categoryAwareMessageFormatConsole = (fields) => {
  // eslint-disable-next-line
  const {level, timestamp, message, category = 'cli', ...rest} = fields;

  const fullMsg = Object.keys(rest).length === 0 ? message : [...message, ' ', rest];
  const ser = serializeMessage(fullMsg, { colors: false });

  const lvl = LEVEL_NAMES[level] ?? level.toLowerCase();
  if (category === 'cli' && level === 'info') {
    return `${ser}`;
  }
  return `${lvl}: ${ser}`;
};

// module global loggers by category
const loggersByCategory = new Map();

/**
 * Gets the logger for the respective category or creates a new one if it does not exist yet.
 * @param {object|string} [config='cli'] The log config or the category name.
 * @param {string} [config.category='cli'] The log category
 * @param {string} [config.level='cli'] The log level
 * @param {string} [config.logsDir='logs'] The log directory.
 * @param {Array|string} [config.logFle=['-', '${category}-server.log']] The log files(s).
 *
 * @returns {SimpleInterface} a helix-log simple interface.
 */
export function getOrCreateLogger(config = 'cli') {
  let categ;
  if (typeof config === 'string') {
    categ = config;
  } else {
    categ = (config && config.category) || 'cli';
  }

  if (loggersByCategory.has(categ)) {
    return loggersByCategory.get(categ);
  }

  // setup helix logger
  const level = (config && config.logLevel) || 'info';
  const logsDir = path.normalize((config && config.logsDir) || 'logs');
  const logFiles = config && Array.isArray(config.logFile)
    ? config.logFile
    : ['-', (config && config.logFile) || path.join(logsDir, `${categ}-server.log`)];

  const loggers = new Map();
  logFiles.forEach((logFile) => {
    const name = loggers.has('default') ? logFile : 'default';
    if (logFile === '-') {
      loggers.set(name, new ConsoleLogger({
        filter: categ === 'cli' ? suppressProgress : filterProgress,
        level,
        formatter: categoryAwareMessageFormatConsole,
      }));
    } else {
      fs.ensureDirSync(path.dirname(logFile));
      loggers.set(name, new FileLogger(logFile, {
        level: 'debug',
        formatter: /\.json/.test(logFile) ? messageFormatJsonString : messageFormatTechnical,
      }));
    }
  });

  // create simple interface
  const log = new SimpleInterface({
    level,
    defaultFields: {
      category: categ,
    },
    logger: new MultiLogger(loggers),
  });

  loggersByCategory.set(categ, log);
  return log;
}
