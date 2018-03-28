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

const {converter} = require('md2json');

const app = express();

const cfg = require('../config.js');

app.get('*', (req, res, next) => {

    // parse URL into a path info object
    const pathInfo = utils.getPathInfo(req);
    if (!pathInfo.valid) {
        res.status(404).send();
        return;
    }

    // check if strain exists
    const strain = _.get(cfg, ['orgs', pathInfo.org, 'repos', pathInfo.repo]);
    if (!strain) {
        console.log('no config found for: %j', pathInfo);
        res.status(404).send();
        return;
    }

    // this is not so nice... ctx should be passed through all the processors below
    const ctx = {
        cfg,
        pathInfo,
        strain,
    };

    utils
        .resolve(cfg, strain, pathInfo, true)
        .then(converter.convertFile)
        .then((mdInfo) => {
            ctx.mdInfo = mdInfo;
            return mdInfo;
        })
        .then(utils.resolveTemplate.bind(utils, cfg, strain, pathInfo)) // bind will add result of last promise at the end of arguments
        .then(utils.compileHtlTemplate)
        .then((compiledPath) => {
            return utils.executeTemplate(compiledPath, ctx.mdInfo);
        })
        .then(result => {
            res.send(result.body);
        }).catch((err) => {
            console.log('resolved path does not exist: %j', err);
            res.status(404).send();
        });
});

app.listen(3000, () => console.log('Petridish server listening on port 3000.\nhttp://localhost:3000/demo/petri/master/'));