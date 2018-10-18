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

/* global describe, it */

const assert = require('assert');
const path = require('path');
const { TemplateResolver, Plugins: TemplateResolverPlugins } = require('../src/template_resolver');
const RequestContext = require('../src/RequestContext.js');

const BUILD_DIR = path.resolve(__dirname, 'specs', 'builddir');

describe('Template Resolver', () => {
  describe('Simple', () => {
    const TESTS = [
      {
        url: '/', template: 'html', script: 'html.js',
      },
      {
        url: '/index.html', template: 'html', script: 'html.js',
      },
      {
        url: '/index.print.html', template: 'print_html', script: 'print_html.js',
      },
      {
        url: '/homepage.txt', template: 'txt', script: 'txt.js',
      },
    ];

    TESTS.forEach((t) => {
      it(`resolves template name for ${t.url} correctly`, () => {
        const mockReq = {
          url: t.url,
        };
        const ctx = new RequestContext(mockReq);
        const template = TemplateResolverPlugins.simple(ctx);
        assert.equal(template, t.template, 'resolved template');
      });
    });

    TESTS.forEach((t) => {
      it(`resolves template script for ${t.url} correctly`, (done) => {
        const mockReq = {
          url: t.url,
        };
        const ctx = new RequestContext(mockReq, {
          buildDir: BUILD_DIR,
        });
        const res = new TemplateResolver().with(TemplateResolverPlugins.simple);

        const templatePath = path.resolve(BUILD_DIR, t.script);
        res.resolve(ctx).then((cx) => {
          assert.equal(cx.templatePath, templatePath, 'resolved template path');
          done();
        }).catch(done);
      });
    });

    it('fails for non existent file', (done) => {
      const mockReq = {
        url: '/index.nonexistent.html',
      };
      const ctx = new RequestContext(mockReq, {
        buildDir: BUILD_DIR,
      });
      const res = new TemplateResolver().with(TemplateResolverPlugins.simple);
      res.resolve(ctx).then(() => {
        done(Error('resolution for non existent file should fail.'));
      }).catch((err) => {
        const expected = 'Unable to resolve template: ENOENT: no such file or directory';
        assert.equal(err.message.substring(0, expected.length), expected);
        done();
      }).catch(done);
    });

    it('fails for directory instead of file', (done) => {
      const mockReq = {
        url: '/index.wrong.html',
      };
      const ctx = new RequestContext(mockReq, {
        buildDir: BUILD_DIR,
      });
      const res = new TemplateResolver().with(TemplateResolverPlugins.simple);
      res.resolve(ctx).then(() => {
        done(Error('resolution for non existent file should fail.'));
      }).catch((err) => {
        const expected = 'Unable to resolve template: no regular file';
        assert.equal(err.message.substring(0, expected.length), expected);
        done();
      }).catch(done);
    });
  });
});
