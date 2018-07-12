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
const { TemplateResolver, Plugins: TemplateResolverPlugins } = require('../src/template_resolver');

const DEFAULT_PORT = 3000;

const esi = new NodeESI({
  baseUrl: `http://localhost:${DEFAULT_PORT}`,
});

/**
 * Executes the template and resolves with the content.
 * @param {RequestContext} ctx Context
 * @return {Promise} A promise that resolves to generated output.
 */
function executeTemplate(ctx) {
  delete require.cache[require.resolve(ctx.templatePath)];
  // eslint-disable-next-line import/no-dynamic-require,global-require
  const mod = require(ctx.templatePath);
  return Promise.resolve(mod.main({
    owner: ctx.config.contentRepo.owner,
    repo: ctx.config.contentRepo.repo,
    ref: ctx.config.contentRepo.ref,
    path: `${ctx.resourcePath.substr(1)}.md`, // either pipeline or git-server don't like the double slash here
  }, {
    REPO_RAW_ROOT: `${ctx.config.contentRepo.rawRoot}/`, // the pipeline needs the final slash here
    REPO_API_ROOT: `${ctx.config.contentRepo.apiRoot}/`,
  }, logger));
}


class HelixServer {
  /**
   * Creates a new HelixServer for the given project.
   * @param {HelixProject} project
   */
  constructor(project) {
    this._project = project;
    this._app = express();
    this._port = DEFAULT_PORT;
    this._server = null;

    // todo: make configurable
    this._templateResolver = new TemplateResolver().with(TemplateResolverPlugins.simple);
  }

  init() {
    const boundResolve = this._templateResolver.resolve.bind(this._templateResolver);
    this._app.get('*', (req, res) => {
      const ctx = new RequestContext(req, this._project);
      if (!ctx.valid) {
        res.status(404).send();
        return;
      }

      if (ctx.extension === 'html' || ctx.extension === 'md') {
        // md files to be transformed
        Promise.resolve(ctx)
          .then(boundResolve)
          .then(executeTemplate)
          .then((result) => {
            if (result instanceof Error) {
              // full response is an error: engine error
              throw result;
            }

            if (result.response
              && result.response.error
              && result.response.error instanceof Error) {
              // response contains an error: processing error
              throw result.response.error;
            }

            if (!result.response.body) {
              // empty body: nothing to render
              throw new Error('Response has no body, don\'t know what to do');
            }

            esi.process(result.response.body).then((body) => {
              res.send(body);
            });
          })
          .catch((err) => {
            logger.error(`Error while delivering resource: ${err.stack || err}`);
            res.status(500).send();
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
            logger.error(`Error while delivering resource: ${err.stack || err}`);
            res.status(404).send();
          });
      }
    });
  }

  withPort(port) {
    this._port = port;
    return this;
  }

  isStarted() {
    return this._server !== null;
  }

  get port() {
    return this._port;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this._server = this._app.listen(this._port, (err) => {
        if (err) {
          reject(new Error(`Error while starting http server: ${err}`));
        }
        this._port = this._server.address().port;
        logger.info(`Petridish server listening on port ${this._port}.`);
        logger.info(`Open soupdemo at http://localhost:${this._port}/index.html`);
        resolve(this._port);
      });
    });
  }

  async stop() {
    if (!this._server) {
      throw new Error('not started.');
    }
    return new Promise((resolve, reject) => {
      this._server.close((err) => {
        if (err) {
          reject(new Error(`Error while stopping http server: ${err}`));
        }
        logger.info('Petridish server stopped.');
        this._server = null;
        resolve();
      });
    });
  }
}

module.exports = HelixServer;
