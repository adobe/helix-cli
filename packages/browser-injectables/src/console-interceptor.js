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

/**
 * Browser Console Interceptor
 * Intercepts console methods and forwards them via WebSocket to the server
 * This script is self-contained and browser-compatible (no module system)
 */
(function iife() {
  // Wait for LiveReload connection
  var checkInterval = setInterval(function checkLiveReload() {
    if (window.LiveReload && window.LiveReload.connector && window.LiveReload.connector.socket) {
      clearInterval(checkInterval);

      // Store original console methods
      var originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info,
      };

      // Helper to safely serialize arguments
      function serializeArgs(args) {
        return Array.from(args).map(function mapArg(arg) {
          try {
            if (arg instanceof Error) {
              return { type: 'Error', message: arg.message, stack: arg.stack };
            }
            return JSON.parse(JSON.stringify(arg));
          } catch (e) {
            return String(arg);
          }
        });
      }

      // Get current file location
      function getLocation() {
        try {
          var stack = new Error().stack;
          var match = stack.match(/at.*?((https?:\/\/[^\s]+?):(\d+):(\d+))/);
          if (match) {
            return { url: match[2], line: match[3] };
          }
        } catch (e) {
          // Ignore error when getting stack
        }
        return { url: window.location.href, line: 0 };
      }

      // Intercept console methods
      ['log', 'error', 'warn', 'info'].forEach(function interceptLevel(level) {
        console[level] = function interceptedConsole() {
          // Call original method
          originalConsole[level].apply(console, arguments);

          // Forward to server if connected
          if (window.LiveReload.connector.socket.readyState === 1) {
            var location = getLocation();
            window.LiveReload.connector.socket.send(JSON.stringify({
              command: 'log',
              level: level,
              args: serializeArgs(arguments),
              url: location.url,
              line: location.line,
            }));
          }
        };
      });
    }
  }, 100);
}());
