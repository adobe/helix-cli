/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

// In-memory store for log messages
const LOG_BUFFER = [];
const MAX_LOG_ENTRIES = 1000; // Limit the number of log entries in memory

/**
 * Add a log entry to the in-memory buffer
 * @param {string} level Log level
 * @param {string} message Log message
 * @param {Object} [context] Additional context
 */
function addLogEntry(level, message, context = {}) {
  // Create a structured log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toLowerCase(),
    message,
    context: { ...context },
  };

  // Add to buffer with truncation if needed
  LOG_BUFFER.push(logEntry);
  if (LOG_BUFFER.length > MAX_LOG_ENTRIES) {
    LOG_BUFFER.shift(); // Remove oldest log entry
  }
}

/**
 * Get log entries from the in-memory buffer
 * @param {number} lines Number of lines to return
 * @param {string} filter Optional filter string
 * @param {number} seconds Optional time range in seconds
 * @param {Array<string>} levels Optional array of log levels to include
 * @returns {Array} Array of log entry objects
 */
export function getLogs(lines = MAX_LOG_ENTRIES, filter = '', seconds = null, levels = null) {
  // Start with a copy of all logs
  let logs = [...LOG_BUFFER];

  // Filter by time range if seconds is specified
  if (seconds !== null && !Number.isNaN(seconds)) {
    const cutoffTime = new Date(Date.now() - (seconds * 1000)).toISOString();
    logs = logs.filter((entry) => entry.timestamp >= cutoffTime);
  }

  // Filter by log levels if specified
  if (levels !== null && Array.isArray(levels) && levels.length > 0) {
    logs = logs.filter((entry) => levels.includes(entry.level));
  }

  // Apply text filter if provided
  if (filter) {
    const filterLower = filter.toLowerCase();
    logs = logs.filter((entry) => {
      const levelMatch = entry.level.includes(filterLower);
      const messageMatch = entry.message.toLowerCase().includes(filterLower);
      const contextMatch = JSON.stringify(entry.context).toLowerCase().includes(filterLower);
      return levelMatch || messageMatch || contextMatch;
    });
  }

  // If seconds was specified, return all logs in that time range
  // Otherwise, get the last N entries
  return seconds !== null ? logs : logs.slice(-lines);
}

/**
 * Reset the log buffer (primarily for testing)
 * @returns {void}
 */
export function resetLogs() {
  LOG_BUFFER.length = 0;
}

/**
 * Create a logger that implements the Helix Logging SimpleInterface
 * and stores logs in memory
 * @param {string} [category='mcp'] Logger category
 * @returns {Object} Logger instance
 */
export function createInMemoryLogger(category = 'mcp') {
  // Create a base logger object
  const logger = {
    category,
  };

  // Add log methods for each level
  ['trace', 'debug', 'info', 'warn', 'error'].forEach((level) => {
    logger[level] = (message, context = {}) => {
      // Add category to context if not already present
      const contextWithCategory = { ...context };
      if (!contextWithCategory.category) {
        contextWithCategory.category = category;
      }

      // Add log entry to buffer
      addLogEntry(level, message, contextWithCategory);
    };
  });

  return logger;
}

/**
 * Create a logger factory function that conforms to SimpleInterface
 * @returns {Function} Logger factory function
 */
export function createLoggerFactory() {
  return (category) => createInMemoryLogger(category);
}

export default {
  createLogger: createInMemoryLogger,
  getLogs,
  resetLogs,
};
