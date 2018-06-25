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
const NodeESI = require('nodesi');
const utils = require('./utils.js');

const RequestContext = require('./RequestContext.js');

const PORT = 3000;
const cfg = require('../config.js');

const app = express();
const esi = new NodeESI({
  baseUrl: `http://localhost:${PORT}`,
});

app.get('*', (req, res) => {
  const ctx = new RequestContext(req, cfg);
  if (!ctx.valid) {
    res.status(404).send();
    return;
  }

  // check if strain exists
  const strain = ctx.strainConfig;
  if (!strain) {
    // eslint-disable-next-line no-console
    console.log('no config found for: %j', ctx.strain);
    res.status(404).send();
    return;
  }

  if (ctx.extension === 'html' || ctx.extension === 'md') {
    // md files to be transformed
    Promise.resolve(ctx)
      .then(utils.fetchContent)
      .then(utils.convertContent)
      .then(utils.collectMetadata)
      .then(utils.fetchPre)
      .then(utils.executePre)
      .then(utils.fetchTemplate)
      .then(utils.compileHtlTemplate)
      .then(utils.executeTemplate)
      .then((result) => {
        esi.process(result.body).then((body) => {
          res.send(body);
        });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Error while delivering resource', err);
        res.status(404).send();
      });
  } else {
    // all the other files (css, images...)
    // for now, fetch code if resource under /dist other, fetch in content.
    // TODO: revisit completely...
    const fetch = ctx.path.startsWith('/dist') ? utils.fetchCode : utils.fetchContent;
    Promise.resolve(ctx)
      .then(fetch)
      .then((result) => {
        res.type(ctx.extension);
        res.send(ctx.path.startsWith('/dist') ? result.code : result.content);
      }).catch((err) => {
      // eslint-disable-next-line no-console
        console.error('Error while delivering resource', err);
        res.status(404).send();
      });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Petridish server listening on port ${PORT}.\nhttp://localhost:${PORT}/demo/index.html`);
});

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('Encountered uncaught exception at process level', err);
});

process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('Encountered unhandled promise rejection at process level', err);
});
