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
import UpCommandImpl from '../up.cmd.js';
import { createInMemoryLogger } from '../mcp-logger.js';
import { registerServer } from './stop.js';

/**
 * Adapter for the up command as an MCP tool
 */
const upTool = {
  name: 'up',
  description: 'Run an AEM development server.\n\nArgs:\n port, open, livereload, etc.',
  inputSchema: {
    properties: {
      port: {
        title: 'Port',
        type: 'integer',
        default: 3000,
        description: 'Development server port',
      },
      addr: {
        title: 'Address',
        type: 'string',
        description: 'Development server bind address',
      },
      open: {
        title: 'Open',
        type: 'string',
        description: 'Path to open in browser',
      },
      livereload: {
        title: 'LiveReload',
        type: 'boolean',
        default: true,
        description: 'Enable automatic reloading of modified sources in browser',
      },
      url: {
        title: 'URL',
        type: 'string',
        description: 'The origin url to fetch content from',
      },
      tlsCert: {
        title: 'TLS Certificate',
        type: 'string',
        description: 'Path to .pem file (for enabling TLS)',
      },
      tlsKey: {
        title: 'TLS Key',
        type: 'string',
        description: 'Path to .key file (for enabling TLS)',
      },
    },
    type: 'object',
  },
  execute: async (args) => {
    try {
      const logger = createInMemoryLogger('up');
      const executor = new UpCommandImpl(logger);

      // Convert string ports to numbers if necessary
      const port = args.port ? parseInt(args.port, 10) : 3000;

      // Set up the command with all possible options from args
      executor
        .withHttpPort(port)
        .withBindAddr(args.addr || '127.0.0.1')
        .withOpen(args.open || false)
        .withTLS(args.tlsKey, args.tlsCert)
        .withLiveReload(args.livereload !== undefined ? args.livereload : true);

      if (args.url) {
        executor.withUrl(args.url);
      }

      if (args.siteToken) {
        executor.withSiteToken(args.siteToken);
      }

      if (args.allowInsecure !== undefined) {
        executor.withAllowInsecure(args.allowInsecure);
      }

      if (args.printIndex !== undefined) {
        executor.withPrintIndex(args.printIndex);
      }

      // Register the server instance for later stopping
      registerServer(port, executor);

      // Start the server without blocking
      executor.run().catch((error) => {
        logger.error(`Error starting AEM server: ${error.message}`);
      });

      return {
        content: [{
          type: 'text',
          text: `AEM development server started on port ${port}. Open http://localhost:${port} to view the site.`,
        }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error starting AEM server: ${error.message}`,
        }],
        isError: true,
      };
    }
  },
};

export default upTool;
