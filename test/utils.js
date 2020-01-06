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
/* eslint-env mocha */
const { Module } = require('module');
const assert = require('assert');
const path = require('path');
const shell = require('shelljs');
const crypto = require('crypto');
const fse = require('fs-extra');
const http = require('http');
const yauzl = require('yauzl');
const { JSDOM } = require('jsdom');
const { dom: { assertEquivalentNode } } = require('@adobe/helix-shared');
const BuildCommand = require('../src/build.cmd');
const ModuleHelper = require('../src/builder/ModuleHelper.js');

/**
 * init git in integration so that helix-simulator can run
 */
function initGit(dir, remote) {
  const pwd = shell.pwd();
  shell.cd(dir);
  shell.exec('git init');
  shell.exec('git add -A');
  shell.exec('git commit -m"initial commit."');
  if (remote) {
    shell.exec(`git remote add origin ${remote}`);
  }
  shell.cd(pwd);
}

function clearHelixEnv() {
  const deleted = {};
  Object.keys(process.env).filter((key) => key.startsWith('HLX_')).forEach((key) => {
    deleted[key] = process.env[key];
    delete process.env[key];
  });
  return deleted;
}

function assertFile(p, expectMissing) {
  const exists = fse.pathExistsSync(p);
  if (!exists && !expectMissing) {
    assert.fail(`Expected file at ${p} exists`);
  }
  if (exists && expectMissing) {
    assert.fail(`Unexpected file at ${p} exists`);
  }
}

async function assertFileEqual(actualFile, expectedFile) {
  const actual = await fse.readFile(actualFile, 'utf-8');
  const expected = await fse.readFile(expectedFile, 'utf-8');
  assert.equal(actual.trim(), expected.trim());
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
              if (Array.isArray(spec)) {
                spec.forEach((str) => {
                  try {
                    assert.equal(data.indexOf(str) >= 0, true);
                  } catch (e) {
                    assert.fail(`response does not contain string "${str}"`);
                  }
                });
              } else {
                let expected = fse.readFileSync(path.resolve(__dirname, 'specs', spec)).toString();
                replacements.forEach((r) => {
                  expected = expected.replace(r.pattern, r.with);
                });
                assert.equal(data.trim(), expected.trim());
              }
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

async function assertHttpDom(url, status, spec) {
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
              const datadom = new JSDOM(data);
              const specdom = new JSDOM(fse.readFileSync(path.resolve(__dirname, 'specs', spec)).toString());
              try {
                assertEquivalentNode(datadom.window.document, specdom.window.document);
              } catch (e) {
                e.actual = datadom.serialize();
                e.expected = specdom.serialize();
                throw e;
              }
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

async function assertZipEntries(zipPath, entries) {
  assertFile(zipPath);

  // check zip
  const result = await new Promise((resolve, reject) => {
    const es = [];
    yauzl.open(zipPath, (err, zipfile) => {
      if (err) {
        reject(err);
      }
      zipfile.on('entry', (entry) => {
        es.push(entry.fileName);
      });

      zipfile.on('close', () => {
        resolve(es);
      });

      zipfile.on('error', reject);
    });
  });
  entries.forEach((s) => {
    assert.ok(result.indexOf(s) >= 0, `${s} must be included in ${zipPath}`);
  });
}

async function createTestRoot() {
  const dir = path.resolve(__dirname, 'tmp', crypto.randomBytes(16).toString('hex'));
  await fse.ensureDir(dir);
  return dir;
}

async function createFakeTestRoot() {
  return path.resolve(__dirname, 'tmp', crypto.randomBytes(16).toString('hex'));
}

/**
 * Global test modules for all tests
 */
let testModules;
async function getTestModules() {
  if (!testModules) {
    testModules = await createTestRoot();
    const moduleHelper = new ModuleHelper()
      .withBuildDir(testModules)
      .withModulePaths([]);

    await moduleHelper.init();
    await moduleHelper.ensureModule('@adobe/helix-pipeline', process.env.HLX_CUSTOM_PIPELINE || '@adobe/helix-pipeline@latest');
  }
  return path.resolve(testModules, 'node_modules');
}

after(async () => {
  if (!testModules) {
    return;
  }
  await fse.remove(testModules);
  testModules = null;
});

async function processSource(scriptName, type = 'htl', modulePaths) {
  const testRoot = await createTestRoot();
  const buildDir = path.resolve(testRoot, '.hlx/build');
  const distHtmlJS = path.resolve(buildDir, 'src', `${scriptName}.js`);
  const distHtmlHtl = path.resolve(buildDir, 'src', `${scriptName}.${type}`);
  const sourceRoot = path.resolve(__dirname, 'specs', 'builder');

  const files = [
    `src/${scriptName}.${type}`,
    `src/${scriptName}.pre.js`,
    'src/helpers.js',
  ];

  await new BuildCommand()
    .withFiles(files)
    .withModulePaths(modulePaths)
    .withDirectory(path.resolve(__dirname, 'specs/builder'))
    .withSourceRoot(sourceRoot)
    .withTargetDir(buildDir)
    .run();

  return {
    testRoot,
    distHtmlHtl,
    distHtmlJS,
  };
}

function requireWithPaths(id, modPaths) {
  if (!Array.isArray(modPaths)) {
    // eslint-disable-next-line no-param-reassign
    modPaths = [modPaths];
  }
  /* eslint-disable no-underscore-dangle */
  const nodeModulePathsFn = Module._nodeModulePaths;
  try {
    Module._nodeModulePaths = function nodeModulePaths(from) {
      let paths = nodeModulePathsFn.call(this, from);
      paths = modPaths.concat(paths);
      return paths;
    };

    // eslint-disable-next-line import/no-dynamic-require,global-require
    return require(id);
  } finally {
    Module._nodeModulePaths = nodeModulePathsFn;
  }
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
  assertFileEqual,
  assertHttp,
  assertHttpDom,
  initGit,
  createTestRoot,
  createFakeTestRoot,
  processSource,
  perfExample,
  assertZipEntries,
  clearHelixEnv,
  getTestModules,
  requireWithPaths,
};
