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
const assert = require('assert');
const path = require('path');
const shell = require('shelljs');
const fse = require('fs-extra');
const unzip = require('unzip');
const http = require('http');
const Replay = require('replay');
const uuidv4 = require('uuid/v4');
const winston = require('winston');
const BuildCommand = require('../src/build.cmd');

// disable replay for this test
Replay.mode = 'bloody';

/**
 * init git in integration so that helix-simulator can run
 */
function initGit(dir) {
  const pwd = shell.pwd();
  shell.cd(dir);
  shell.exec('git init');
  shell.exec('git add -A');
  shell.exec('git commit -m"initial commit."');
  shell.cd(pwd);
}

function assertFile(p, expectMissing) {
  const exists = fse.pathExistsSync(p);
  if (!exists && !expectMissing) {
    assert.fail(`Expected file at ${p} to exists`);
  }
  if (exists && expectMissing) {
    assert.fail(`Unexpected file at ${p} exists`);
  }
}

async function assertZipEntry(zipFile, name, exists = true) {
  return new Promise((resolve, reject) => {
    let doesExist = false;
    fse.createReadStream(zipFile)
      .pipe(unzip.Parse())
      .on('entry', (entry) => {
        const fileName = entry.path;
        if (fileName === name) {
          doesExist = true;
        } else {
          entry.autodrain();
        }
      })
      .on('close', () => {
        if (exists === doesExist) {
          resolve();
        } else {
          reject(Error(`Zip ${path.relative(process.cwd(), zipFile)} should ${exists ? '' : 'not '}contain entry ${name}.`));
        }
      });
  });
}

async function assertHttp(url, status, spec, replacements = []) {
  return new Promise((resolve, reject) => {
    let data = '';
    http.get(url, (res) => {
      try {
        assert.equal(res.statusCode, status);
      } catch (e) {
        res.resume();
        reject(e);
      }

      res
        .on('data', (chunk) => {
          data += chunk;
        })
        .on('end', () => {
          try {
            if (spec) {
              let expected = fse.readFileSync(path.resolve(__dirname, 'specs', spec)).toString();
              replacements.forEach((r) => {
                expected = expected.replace(r.pattern, r.with);
              });
              assert.equal(data, expected);
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        });
    }).on('error', (e) => {
      reject(e);
    });
  });
}

async function createTestRoot() {
  const dir = path.resolve(__dirname, 'tmp', uuidv4());
  await fse.ensureDir(dir);
  return dir;
}

function createLogger() {
  return winston.createLogger({
    level: 'silly',
    silent: true,
    format: winston.format.simple(),
    transports: new winston.transports.Console(),
  });
}

async function processSource(scriptName) {
  const testRoot = await createTestRoot();
  const buildDir = path.resolve(testRoot, '.hlx/build');
  const distHtmlJS = path.resolve(buildDir, `${scriptName}.js`);
  const distHtmlHtl = path.resolve(buildDir, `${scriptName}.htl`);

  const files = [
    path.resolve(__dirname, `specs/parcel/${scriptName}.htl`),
    path.resolve(__dirname, `specs/parcel/${scriptName}.pre.js`),
    path.resolve(__dirname, 'specs/parcel/helpers.js'),
  ];
  //
  // if (await fse.pathExists(pre))
  await new BuildCommand()
    .withFiles(files)
    .withTargetDir(buildDir)
    .withWebRoot('/webroot')
    .withCacheEnabled(false)
    .run();

  return {
    distHtmlHtl,
    distHtmlJS,
  };
}

const perfExample = {
  uuid: '170b278',
  url: 'https://debug.primordialsoup.life/develop/',
  formattedTestUrl: 'https://calibreapp.com/tests/170b278/4161820',
  status: 'completed',
  updatedAt: '2018-08-29T13:00:08Z',
  metrics: [
    { name: 'speed_index', label: 'Speed Index', value: 1233 },
    {
      name: 'visually_complete',
      label: 'Visually Complete',
      value: 1233,
    },
    {
      name: 'visually_complete_85',
      label: '85% Visually Complete',
      value: 1233,
    },
    {
      name: 'lighthouse-seo-score',
      label: 'Lighthouse SEO Score',
      value: 44,
    },
    {
      name: 'lighthouse-best-practices-score',
      label: 'Lighthouse Best Practices Score',
      value: 87,
    },
    {
      name: 'lighthouse-accessibility-score',
      label: 'Lighthouse Accessibility Score',
      value: 50,
    },
    {
      name: 'lighthouse-performance-score',
      label: 'Lighthouse Performance Score',
      value: 99,
    },
    {
      name: 'lighthouse-pwa-score',
      label: 'Lighthouse Progressive Web App Score',
      value: 36,
    },
    {
      name: 'js-parse-compile',
      label: 'JS Parse & Compile',
      value: 0,
    },
    {
      name: 'time-to-first-byte',
      label: 'Time to First Byte',
      value: 1064,
    },
    {
      name: 'first-contentful-paint',
      label: 'First Contentful Paint',
      value: 1218,
    },
    {
      name: 'first-meaningful-paint',
      label: 'First Meaningful Paint',
      value: 1218,
    },
    { name: 'firstRender', label: 'First Paint', value: 1218 },
    { name: 'dom-size', label: 'DOM Element Count', value: 3 },
    {
      name: 'estimated-input-latency',
      label: 'Estimated input latency',
      value: 16,
    },
    {
      name: 'consistently-interactive',
      label: 'Time to Interactive',
      value: 1218,
    },
    {
      name: 'first-interactive',
      label: 'First CPU Idle',
      value: 1218,
    },
    {
      name: 'html_body_size_in_bytes',
      label: 'Total HTML size in bytes',
      value: 80,
    },
    {
      name: 'html_size_in_bytes',
      label: 'Total HTML transferred',
      value: 239,
    },
    { name: 'page_wait_timing', label: 'Response time', value: 1236 },
    {
      name: 'page_size_in_bytes',
      label: 'Total Page transferred',
      value: 239,
    },
    {
      name: 'page_body_size_in_bytes',
      label: 'Total Page size in bytes',
      value: 80,
    },
    { name: 'asset_count', label: 'Number of requests', value: 1 },
    { name: 'onload', label: 'onLoad', value: 1196 },
    { name: 'oncontentload', label: 'onContentLoad', value: 1198 },
  ],
  device: { title: 'Motorola Moto G4' },
  connection: { title: 'Regular 3G' },
  location: { name: 'London, United Kingdom', emoji: '🇬🇧' },
};

module.exports = {
  assertFile,
  assertHttp,
  assertZipEntry,
  initGit,
  createTestRoot,
  createLogger,
  processSource,
  perfExample,
};
