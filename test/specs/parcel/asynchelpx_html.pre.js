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

/* eslint-disable no-param-reassign */

const _ = require('lodash/fp');
const request = require('request-promise');

/**
 * Fetches the git metadata
 */
async function collectMetadata(req, logger) {
  const options = {
    uri: `https://api.github.com/repos/${req.params.owner}/${
      req.params.repo
    }/commits?path=${req.params.path}&sha=${req.params.ref}`,
    headers: {
      'User-Agent': 'Request-Promise',
    },
    json: true,
  };

  logger.debug(`Fetching Git Metadata from ${options.uri}`);
  try {
    const metadata = await request(options);
    logger.debug('Got git metadata');
    return metadata;
  } catch (error) {
    logger.error('Failed to get metadata', error);
    return {};
  }
}

async function extractCommittersFromMetadata(meta) {
  const res = Object.values(meta)
    .filter(commit => !!commit.author)
    .map(commit => ({
      avatar_url: commit.author.avatar_url,
      display: `${commit.commit.author.name} | ${commit.commit.author.email}`,
    }));
  return _.uniqBy(JSON.stringify, res);
}

async function extractLastModifiedFromMetadata(meta = [], logger) {
  logger.debug('Getting last modified date from Git');
  const lastMod = meta.length > 0
    && meta[0].commit
    && meta[0].commit.author ? meta[0].commit.author.date : null;

  logger.debug(lastMod);
  return {
    raw: lastMod,
    display: lastMod ? new Date(lastMod) : 'Unknown',
  };
}

// the most compact way to write a pre.js:
//
// module.exports.pre is a function (taking next as an argument)
// that returns a function (with payload, secrets, logger as arguments)
// that calls next (after modifying the payload a bit)
async function pre(payload, config) {
  const { logger } = config;
  try {
    const myPayload = Object.assign({}, payload);

    logger.debug('setting context path');
    myPayload.resource.contextPath = 'myinjectedcontextpath';

    logger.debug('collecting metadata');
    const gitmeta = await collectMetadata(payload.request, logger);

    logger.debug('Metadata has arrived');
    payload.resource.gitmetadata = gitmeta;
    payload.resource.committers = await extractCommittersFromMetadata(gitmeta, logger);
    payload.resource.lastModified = await extractLastModifiedFromMetadata(gitmeta, logger);
  } catch (e) {
    logger.error(e);
    throw e;
  }
}

module.exports.pre = pre;
