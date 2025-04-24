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
import readline from 'readline';
import { AbstractCommand } from './abstract.cmd.js';

export default class MCPCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._tools = [];
  }

  withTools(tools) {
    this._tools = tools || [];
    return this;
  }

  async run() {
    this.log.info('Starting MCP server...');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', (line) => {
      try {
        const request = JSON.parse(line);
        this.handleRequest(request);
      } catch (error) {
        this.log.error(`Error processing request: ${error.message}`);
        this.sendErrorResponse(-32700, 'Parse error', null);
      }
    });

    this.log.info('MCP server ready. Reading from stdin...');
  }

  handleRequest(request) {
    const { method, id } = request;

    if (method === 'initialize') {
      this.sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          experimental: {},
          prompts: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
          tools: { listChanged: false },
        },
        serverInfo: {
          name: 'helix-cli-mcp',
          version: '0.0.1',
        },
      });
    } else if (method === 'notifications/initialized') {
      // Do nothing
    } else if (method === 'tools/list') {
      this.sendResponse(id, {
        tools: this._tools,
      });
    } else if (method === 'resources/list') {
      this.sendResponse(id, {
        resources: [],
      });
    } else if (method === 'prompts/list') {
      this.sendResponse(id, {
        prompts: [],
      });
    } else if (method === 'tools/call') {
      this.handleToolCall(request, id);
    } else if (method === 'ping') {
      this.sendResponse(id, {});
    } else {
      this.sendErrorResponse(id, -32601, 'Method not found');
    }
  }

  async handleToolCall(request, id) {
    const { name, arguments: args } = request.params;
    const tool = this._tools.find((t) => t.name === name);

    if (!tool) {
      this.sendErrorResponse(id, -32601, `Tool '${name}' not found`);
      return;
    }

    try {
      if (typeof tool.execute === 'function') {
        const result = await Promise.resolve(tool.execute(args));
        this.sendResponse(id, result);
      } else {
        this.sendErrorResponse(id, -32603, `Tool '${name}' does not have an execute function`);
      }
    } catch (error) {
      this.log.error(`Error executing tool ${name}: ${error.message}`);
      this.sendErrorResponse(id, -32603, `Error executing tool: ${error.message}`);
    }
  }

  sendResponse(id, result) {
    const response = {
      jsonrpc: '2.0',
      id,
      result,
    };
    this.log.debug(`Sending response: ${JSON.stringify(response)}`);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(response));
  }

  sendErrorResponse(id, code, message) {
    const response = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
      },
    };
    this.log.debug(`Sending error response: ${JSON.stringify(response)}`);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(response));
  }
}
