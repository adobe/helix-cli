/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

const path = require('path');
const shell = require('shelljs');
const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiFiles = require('chai-files');

const Replay = require('replay');

// disable replay for this test
Replay.mode = 'bloody';

// setup chai
chai.use(chaiFiles);
chai.use(chaiHttp);

const { expect } = chai;
const { file } = chaiFiles;

/**
 * init git in integration so that petridish can run
 */
function initGit(dir) {
  const pwd = shell.pwd();
  shell.cd(dir);
  shell.exec('git init');
  shell.exec('git add -A');
  shell.exec('git commit -m"initial commit."');
  shell.cd(pwd);
}

async function assertHttp(host, pathname, status, spec) {
  return chai.request(host)
    .get(pathname)
    .then((res) => {
      expect(res).to.have.status(status);
      if (spec) {
        expect(res.text).to.equal(file(path.resolve(__dirname, 'specs', spec)));
      }
    });
}

module.exports = {
  assert: chai.assert,
  expect,
  file,
  assertHttp,
  initGit,
};
