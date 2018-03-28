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

/* global describe, it */

const assert = require('assert');
const utils = require('../src/utils.js');

describe('Utils Test', function() {

    describe('Path Info Tests', function() {

        const TESTS = [
            {url: '/', valid: false},
            {url: '/org0', valid: false},
            {url: '/org0/repo0', valid: false},
            {url: '/org0/repo0/branch0', valid: true, org: 'org0', repo: 'repo0', branch: 'branch0', path: '/'},
            {url: '/org0/repo0/branch0/', valid: true, org: 'org0', repo: 'repo0', branch: 'branch0', path: '/'},
            {url: '/org0/repo0/branch0/content', valid: true, org: 'org0', repo: 'repo0', branch: 'branch0', path: '/content'},
            {url: '/org0/repo0/branch0/content/index.html', valid: true, org: 'org0', repo: 'repo0', branch: 'branch0', path: '/content/index.html'}
        ];

        TESTS.forEach(function(t) {
            it(`parses ${t.url} correctly`, function() {
                const mockReq = {
                    url: t.url
                };
                const p = utils.getPathInfo(mockReq);
                assert.equal(p.valid, t.valid, 'valid');
                if (p.valid) {
                    assert.equal(p.org, t.org, 'org');
                    assert.equal(p.repo, t.repo, 'repo');
                    assert.equal(p.path, t.path, 'path');
                }
            });
        });
    });

    describe('Resolve Tests', function() {

        const TESTS = [
            {branch: 'master', path: '/content.html', resolved: '/usr/local/share/helix/content_repo/master/content.md'},
            {branch: 'master', path: '/content', resolved: '/usr/local/share/helix/content_repo/master/content.md'},
            {branch: 'master', path: '/content/', resolved: '/usr/local/share/helix/content_repo/master/content/index.md'},
            {branch: 'master', path: '/', resolved: '/usr/local/share/helix/content_repo/master/index.md'},
            {branch: 'master', path: '/content.selectors.not.supported.html', resolved: '/usr/local/share/helix/content_repo/master/content.selectors.not.supported.md'}
        ];

        TESTS.forEach(function(t) {
            it(`parses ${t.path} correctly`, function() {
                const mockCfg = {
                    baseDir: '/usr/local/share/helix'
                };
                const mockStrain = {
                    content: 'content_repo'
                };
                return utils.resolve(mockCfg, mockStrain, t).then(resolved => {
                    assert.equal(resolved, t.resolved, 'resolved');
                });
            });
        });
    });

});
