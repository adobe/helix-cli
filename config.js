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

const baseDir = path.join(__dirname, 'dishes');

module.exports = {
    strains: {
        'demo': {
            // example of using the local filesystem as source
            code: path.join(baseDir, 'github_soupdemo_code/master'),
            content: path.join(baseDir, 'github_soupdemo_content/master'),
            cache: path.join(baseDir, 'tmp', 'demo')
        },

        'localgit': {
            // example of using a local git server as source
            code: 'http://localhost:5000/raw/helix/helix-demo-code/master',
            content: 'http://localhost:5000/raw/helix/helix-demo-content/master',
            cache: path.join(baseDir, 'tmp', 'localgit')
        }
    }
};
