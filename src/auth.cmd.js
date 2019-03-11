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
const path = require('path');
const rp = require('request-promise-native');
const fse = require('fs-extra');
const chalk = require('chalk');
const opn = require('opn');
const AbstractCommand = require('./abstract.cmd.js');
const LoginServer = require('./auth-login-server.js');
const cliutils = require('./cli-util');

const HELIX_LOGIN_START_URL = 'https://app.project-helix.io/login/start';

class AuthCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._token = '';
    this._showToken = true;
    this._openBrowser = true;
    // those are for testing
    this._stdout = process.stdout;
    this._stdin = process.stdin;
    this._askAdd = null;
    this._askFile = null;
  }

  // eslint-disable-next-line class-methods-use-this
  get requireConfigFile() {
    return false;
  }

  withOpenBrowser(value) {
    this._openBrowser = value;
    return this;
  }

  /**
   * @override
   */
  async init() {
    await super.init();

    if (!this._stdout.isTTY) {
      throw Error('Interactive authentication tool not supported on non interactive consoles.');
    }
  }

  async receiveToken() {
    const srv = new LoginServer()
      .withLogger(this.log);
    await srv.start();
    this.emit('server-start', srv.port);
    this._loginUrl = `${HELIX_LOGIN_START_URL}?p=${srv.port}`;

    this._stdout.write(`
Thank you for choosing the automatic Helix Bot Authentication process.
I will shortly open a browser with the following url. In case the 
browser doesn't open automatically, please navigate to the url manually:

    ${chalk.cyan(this._loginUrl)}

Oh, and I started local server, bound to 127.0.0.1:${srv.port} and am 
awaiting the completion of the process. `);

    const spinner = cliutils.createSpinner().start();
    if (this._openBrowser) {
      setTimeout(() => {
        opn(this._loginUrl, { wait: false });
      }, 1000);
    }
    this._token = await srv.waitForToken();
    spinner.stop();
    await srv.stop();
    this.emit('server-stop');
    this._stdout.write(`

The authentication process has completed. Thank you. 
You can now close the browser window if it didn't close automatically.

I received an access token that I can use to access the Helix Bot on your behalf:
`);
  }

  async showUserInfo() {
    // fetch some user info
    const userInfo = await rp({
      uri: 'https://api.github.com/user',
      headers: {
        'User-Agent': 'HelixBot',
        Authorization: `token ${this._token}`,
      },
      json: true,
    });

    this._stdout.write(`\n${chalk.gray('   Name: ')}${userInfo.name}\n`);
    this._stdout.write(`${chalk.gray('  Login: ')}${userInfo.login}\n\n`);
  }

  async run() {
    await this.init();

    await this.receiveToken();
    await this.showUserInfo();

    const rl = readline.createInterface({
      input: this._stdin,
      output: this._stdout,
      terminal: true,
    });

    const answer = this._askAdd !== null ? this._askAdd : (await cliutils.prompt(rl, 'If you wish, I can add it to a file? [Y/n]: ')).toLowerCase();
    if (answer === '' || answer === 'y' || answer === 'yes') {
      const file = this._askFile !== null ? this._askFile : (await cliutils.prompt(rl, 'which file? [.env]: ')) || '.env';
      const p = path.resolve(this.directory, file);
      let env = '';
      if (await fse.pathExists(p)) {
        env = await fse.readFile(p, 'utf-8');
      }
      // check if token is already present
      if (env.indexOf('HLX_GITHUB_TOKEN') >= 0) {
        env = env.replace(/HLX_GITHUB_TOKEN\s*=\s*[^\s]+/, `HLX_GITHUB_TOKEN=${this._token}`);
      } else {
        if (env && !env.endsWith('\n')) {
          env += '\n';
        }
        env = `${env}HLX_GITHUB_TOKEN=${this._token}\n`;
      }
      await fse.writeFile(p, env, 'utf-8');
      this._showToken = false;
      this._stdout.write(`\nAdded github token to: ${chalk.cyan(file)}\n\n`);
    }

    rl.close();

    if (this._showToken) {
      this._stdout.write(`
Ok, you can add it manually, then. Here it is:

  ${chalk.grey(`HLX_GITHUB_TOKEN=${this._token}`)}

`);
    }
  }
}

module.exports = AuthCommand;
