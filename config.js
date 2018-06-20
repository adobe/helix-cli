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
const StrainURLs = require('strainconfig').StrainURLs;
const LocalURLs = require('./src/LocalURLs');

const baseDir = path.join(__dirname, 'dishes');

module.exports = {
    strains: {
        'demo': {
            // example of using the local filesystem as source
            urls: new LocalURLs({
                code: path.join(baseDir, 'github_soupdemo_code/master'),
                content: path.join(baseDir, 'github_soupdemo_content/master')
            }),
            cache: path.join(baseDir, 'tmp', 'demo')
        },

        'helpx': {
            // helpx using a local git server as source for content and code
            urls: new StrainURLs({
                code: 'http://localtest.me:5000/adobe/helix-helpx',
                content: 'http://localtest.me:5000/Adobe-Marketing-Cloud/reactor-user-docs'
            }),
            cache: path.join(baseDir, 'tmp', 'helpx')
        },

        'helpx-remote': {
            // helpx using github as source for content and code
            urls: new StrainURLs({
                code: 'https://github.com/adobe/helix-helpx',
                content: 'https://github.com/Adobe-Marketing-Cloud/reactor-user-docs'
            }),
            cache: path.join(baseDir, 'tmp', 'helpx')
        },

        'helpx-mix': {
            // helpx using a github as source for content and a local git server as source for code
            urls: new StrainURLs({
                code: 'http://localtest.me:5000/adobe/helix-helpx',
                content: 'https://github.com/Adobe-Marketing-Cloud/reactor-user-docs'
            }),
            cache: path.join(baseDir, 'tmp', 'helpx')
        },

        'helpx-v02': {
            // helpx using a local git server as source for content and code but branch v0.1 (sample release tag) of the code.
            urls: new StrainURLs({
                code: 'http://localtest.me:5000/adobe/helix-helpx/tree/v0.2',
                content: 'http://localtest.me:5000/Adobe-Marketing-Cloud/reactor-user-docs/tree/master'
            }),
            cache: path.join(baseDir, 'tmp', 'helpx')
        },

    }
};
