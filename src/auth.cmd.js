/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const readline = require('readline');
const { Writable } = require('stream');
const Octokit = require('@octokit/rest');
const AbstractCommand = require('./abstract.cmd.js');

const mutableStdout = new Writable({
  write(chunk, encoding, callback) {
    if (!this.muted) {
      process.stdout.write(chunk, encoding);
    }
    callback();
  },
});

async function prompt(rl, question, hide = false) {
  return new Promise((resolve) => {
    mutableStdout.muted = false;
    rl.question(question,resolve);
    mutableStdout.muted = hide;
  });
}

class BuildCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._token = '';
    this._username = '';
    this._password = '';
    this._2fa = '';
  }

  // eslint-disable-next-line class-methods-use-this
  get requireConfigFile() {
    return false;
  }

  withToken(value) {
    this._token = value;
    return this;
  }

  withUsername(value) {
    this._username = value;
    return this;
  }

  withPassword(value) {
    this._password = value;
    return this;
  }

  with2FA(value) {
    this._2fa = value;
    return this;
  }

  /**
   * @override
   */
  async init() {
    await super.init();

    this._rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    });
  }

  async initOctoKit() {
    const auth = async () => {
      if (this._token) {
        return `token ${this._token}`;
      }

      if (!this._username) {
        this._username = await prompt(this._rl, 'Github Username:');
      }
      if (!this._password) {
        this._password = await prompt(this._rl, 'Github Password:', true);
      }

      return {
        username: this._username,
        password: this._password,
        on2fa: async () => {
          if (!this._2fa) {
            this._2fa = await prompt(this._rl, 'Two-factor authentication Code:');
          }
          return this._2fa;
        },
      };
    };

    const octokit = new Octokit({
      // see "Authentication" section below
      auth: await auth(),

      // setting a user agent is required: https://developer.github.com/v3/#user-agent-required
      // v1.2.3 will be current @octokit/rest version
      userAgent: 'octokit/rest.js v1.2.3',

      // add list of previews you’d like to enable globally,
      // see https://developer.github.com/v3/previews/.
      // Example: ['jean-grey-preview', 'symmetra-preview']
      previews: [],

      // set custom URL for on-premise GitHub Enterprise installations
      baseUrl: 'https://api.github.com',

      // pass custom methods for debug, info, warn and error
      log: this.log,

      request: {
        // Node.js only: advanced request options can be passed as http(s) agent,
        // such as custom SSL certificate or proxy settings.
        // See https://nodejs.org/api/http.html#http_class_http_agent
        agent: undefined,

        // request timeout in ms. 0 means no timeout
        timeout: 0,
      },
    });

    if (!this._token) {
      // check if we have a token for our 'note'
      const auths = await octokit.oauthAuthorizations.listAuthorizations({
        per_page: 100,
      });
      for (const a of auths.data) {
        if (a.note === 'Helix Development') {
          this.log.error('Authorization for helix development already exist. Please provide token or delete in https://github.com/settings/tokens');
          return octokit;
        }
      }

      // create new token
      try {
        const result = await octokit.oauthAuthorizations.createAuthorization({
          scopes: ['repo'],
          note: 'Helix Development',
          // note_url,
          // client_id,
          // client_secret,
          // fingerprint
        });
        console.log(`New token: ${result.data.token}`);
      } catch (e) {
        console.error(e.errors);
      }

    }

    return octokit;
  }

  async run() {
    await this.init();

    const octokit = await this.initOctoKit();

    const result = await octokit.issues.list({
      filter: 'assigned',
      state: 'open',
    });
    // const result = await octokit.repos.list({
    //   visibility: 'all',
    //   affiliation: 'owner',
    // });

    for (const issue of result.data) {
      console.log(issue.title);
    }

    this._rl.close();
  }
}

module.exports = BuildCommand;
