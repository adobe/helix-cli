/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const express = require('express');
const NodeESI = require('nodesi');
const utils = require('./utils.js');
const logger = require('./logger.js');

const RequestContext = require('./RequestContext.js');

const PORT = 3000;

const app = express();
const esi = new NodeESI({
  baseUrl: `http://localhost:${PORT}`,
});

app.get('*', (req, res) => {
  const ctx = new RequestContext(req, app.locals.cfg);
  if (!ctx.valid) {
    res.status(404).send();
    return;
  }

  if (ctx.extension === 'html' || ctx.extension === 'md') {
    // md files to be transformed
    Promise.resolve(ctx)
      .then(utils.fetchContent)
      .then(utils.convertContent)
      .then(utils.collectMetadata)
      .then(utils.resolveTemplate)
      .then(utils.executeTemplate)
      .then((result) => {
        esi.process(result.response.body).then((body) => {
          res.send(body);
        });
      })
      .catch((err) => {
        logger.error('Error while delivering resource', err);
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
        logger.error('Error while delivering resource', err);
        res.status(404).send();
      });
  }
});

async function start(hlxProject) {
  app.locals.cfg = hlxProject;
  return new Promise((resolve) => {
    app.listen(PORT, () => {
      logger.info(`Petridish server listening on port ${PORT}.`);
      logger.info(`Open soupdemo at http://localhost:${PORT}/index.html`);
      resolve(PORT);
    });
  });
}

module.exports = {
  start,
};
