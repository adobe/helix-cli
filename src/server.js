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

const express = require('express');
const utils = require('./utils.js');
const _ = require('lodash');

const RequestContext = require('./RequestContext.js');

const cfg = require('../config.js');
const app = express();


app.get('*', (req, res) => {

    const ctx = new RequestContext(req, cfg);
    if (!ctx.valid) {
        res.status(404).send();
        return;
    }

    // check if strain exists
    const strain = ctx.strainConfig;
    if (!strain) {
        console.log('no config found for: %j', ctx.strain);
        res.status(404).send();
        return;
    }

    if ('html' === ctx.extension || 'md' === ctx.extension) {
        // md files to be transformed
        Promise.resolve(ctx)
            .then(utils.fetchContent)
            .then(utils.convertContent)
            .then(utils.fetchCode)
            .then(utils.compileHtlTemplate)
            .then(utils.executeTemplate)
            .then(result => {
                res.send(result.body);
            }).catch((err) => {
                console.log('resolved path does not exist: %j', err);
                res.status(404).send();
            });
    } else {
        // all the other files (css, images...)
        Promise.resolve(ctx)
            .then(utils.fetchContent)
            .then(result => {
                res.type(ctx.extension);
                res.send(result.content);
            }).catch((err) => {
                console.log('resolved path does not exist: %j', err);
                res.status(404).send();
            });
    }
});

app.listen(3000, () => console.log('Petridish server listening on port 3000.\nhttp://localhost:3000/demo/index.html'));