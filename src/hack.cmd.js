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

const chalk = require('chalk');
const AbstractCommand = require('./abstract.cmd.js');

class HackCommand extends AbstractCommand {
  // eslint-disable-next-line class-methods-use-this
  get requireConfigFile() {
    return false;
  }

  withHackathon(value) {
    this._hackathon = value + (value === '' ? '' : '.md');
    return this;
  }

  async run() {
    await this.init();
    const url = `https://github.com/adobe/helix-home/tree/master/hackathons/${this._hackathon || ''}`;
    // eslint-disable-next-line no-console
    console.log(chalk`Check out the Helix Hackathon at {blue ${url}}`);
  }
}

module.exports = HackCommand;
