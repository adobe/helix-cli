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
import assert from 'assert';
import fse from 'fs-extra';
import net from 'net';
import path from 'path';
import RequestContext from '../src/server/RequestContext.js';
import utils from '../src/server/utils.js';
import { createTestRoot } from './utils.js';

describe('Utils Test', () => {
  describe('Request context', () => {
    const TESTS = [
      {
        url: '/', path: '/index.html', resourcePath: '/index', selector: '', extension: 'html',
      },
      {
        url: '/content', path: '/content.html', resourcePath: '/content', selector: '', extension: 'html',
      },
      {
        url: '/content/', path: '/content/index.html', resourcePath: '/content/index', selector: '', extension: 'html',
      },
      {
        url: '/content/index.html', path: '/content/index.html', resourcePath: '/content/index', selector: '', extension: 'html',
      },
      {
        url: '/content/index.foo.html', path: '/content/index.foo.html', resourcePath: '/content/index', selector: 'foo', extension: 'html',
      },
      {
        url: '/docs/index.foo.html',
        path: '/docs/index.foo.html',
        resourcePath: '/docs/index',
        selector: 'foo',
        extension: 'html',
        relPath: '/docs/index.foo.html',
      },
      {
        url: '/content/index.foo.html',
        path: '/content/index.foo.html',
        resourcePath: '/content/index',
        selector: 'foo',
        extension: 'html',
        query: {
          p1: '1',
          p2: true,
        },
        headers: {
          h1: '1',
        },
        expectedJson: {
          extension: 'html',
          headers: {
            h1: '1',
          },
          method: 'GET',
          params: {
            p1: '1',
            p2: true,
          },
          path: '/content/index.foo.html',
          queryString: '',
          resourcePath: '/docs/content/index',
          selector: 'foo',
          url: '/content/index.foo.html',
        },
      },
      {
        url: '/content/index.post.html?a=1&b=2',
        valid: true,
        path: '/content/index.post.html',
        resourcePath: '/content/index',
        selector: 'post',
        extension: 'html',
        method: 'POST',
        body: {
          content: {
            body: 'Test',
          },
        },
        expectedJson: {
          extension: 'html',
          headers: {},
          params: {},
          method: 'POST',
          path: '/content/index.post.html',
          queryString: '?a=1&b=2',
          resourcePath: '/content/index',
          selector: 'post',
          url: '/content/index.post.html?a=1&b=2',
          body: {
            content: {
              body: 'Test',
            },
          },
        },
      },
    ];

    TESTS.forEach((t) => {
      it(`parses ${t.url} correctly`, () => {
        const mockReq = {
          url: t.url,
          query: t.query,
          headers: t.headers,
          body: t.body || undefined,
          method: t.method || undefined,
          originalUrl: t.url,
          protocol: 'http',
          get: (key) => (key === 'host' ? 'localhost' : ''),
        };
        const p = new RequestContext(mockReq, t.config || {});
        assert.equal(p.url, t.url);
        assert.equal(p.path, t.path, 'path');
        assert.equal(p.resourcePath, t.resourcePath, 'resourcePath');
        assert.equal(p.selector, t.selector, 'selector');
        assert.equal(p.extension, t.extension, 'extension');
        assert.equal(p.relPath, t.relPath || t.path, 'relPath');
        assert.deepEqual(p.params, t.query || {}, 'params');
        assert.deepEqual(p.headers, t.headers || {}, 'headers');
      });
    });
  });

  describe('Random chars', () => {
    it('generates a random string of the desired length', () => {
      const generated = {};
      for (let i = 0; i < 32; i += 1) {
        const s = utils.randomChars(i);
        assert.equal(s.length, i);
        assert.ok(!generated[s]);
        generated[s] = true;
      }
    });

    it('generates a random hex string of the desired length', () => {
      const generated = {};
      for (let i = 0; i < 32; i += 1) {
        const s = utils.randomChars(i, true);
        if (i > 0) {
          assert.ok(/^[0-9a-f]+$/.test(s));
        }
        assert.equal(s.length, i);
        assert.ok(!generated[s]);
        generated[s] = true;
      }
    });
  });

  describe('Port Check', () => {
    it('detects an occupied port', (done) => {
      const srv = net.createServer().listen();
      srv.on('listening', async () => {
        const inUse = await utils.checkPortInUse(srv.address().port);
        assert.ok(inUse);
        srv.close();
      });
      srv.on('close', async () => {
        done();
      });
    });

    it('detects a free port', (done) => {
      const srv = net.createServer().listen();
      let port = -1;
      srv.on('listening', async () => {
        // eslint-disable-next-line
        port = srv.address().port;
        srv.close();
      });
      srv.on('close', async () => {
        const inUse = await utils.checkPortInUse(port);
        assert.ok(!inUse);
        done();
      });
    });

    it('gives an error for illegal port', async () => {
      try {
        await utils.checkPortInUse(-1);
      } catch (e) {
        // node 8 and node 10 have different errors ....
        assert.ok(e.toString().indexOf('should be >= 0 and < 65536') > 0 // node 8
          || e.toString().indexOf('should be > 0 and < 65536') > 0); // node 10
      }
    });

    it('gives an error for port not available', async () => {
      try {
        await utils.checkPortInUse(0);
      } catch (e) {
        assert.ok(e.toString().startsWith('Error: connect EADDRNOTAVAIL'));
      }
    });
  });

  describe('Proxy URL test', () => {
    it('Creates proxy url', () => {
      assert.equal(
        utils.makeProxyURL('/foo.html', 'https://helix-pages--adobe.hlx.page'),
        'https://helix-pages--adobe.hlx.page/foo.html',
      );
    });

    it('Creates proxy url with search params for json', () => {
      assert.equal(
        utils.makeProxyURL('/index.json?limit=256', 'https://helix-pages--adobe.hlx.page'),
        'https://helix-pages--adobe.hlx.page/index.json?limit=256',
      );
    });

    it('Creates proxy url with search params for cgi-bin', () => {
      assert.equal(
        utils.makeProxyURL('/cgi-bin/sitemap?limit=256', 'https://helix-pages--adobe.hlx.page'),
        'https://helix-pages--adobe.hlx.page/cgi-bin/sitemap?limit=256',
      );
    });

    it('Creates proxy url with search params for hlx_ paths', () => {
      assert.equal(
        utils.makeProxyURL('/hlx_superstatic?x=1234', 'https://helix-pages--adobe.hlx.page'),
        'https://helix-pages--adobe.hlx.page/hlx_superstatic?x=1234',
      );
    });

    it('Creates proxy url with search params for media_ paths', () => {
      assert.equal(
        utils.makeProxyURL('/foo/media_1234?format=webp', 'https://helix-pages--adobe.hlx.page'),
        'https://helix-pages--adobe.hlx.page/foo/media_1234?format=webp',
      );
    });

    it('Strips search params from proxy url', () => {
      assert.equal(
        utils.makeProxyURL('/foo.html?code=123', 'https://helix-pages--adobe.hlx.page'),
        'https://helix-pages--adobe.hlx.page/foo.html',
      );
    });
  });

  describe('Cache', () => {
    it('compute path for cache', () => {
      assert.equal(utils.computePathForCache('/index.html', '', '/target/'), path.resolve('/target', 'index.html'));
      assert.equal(utils.computePathForCache('/folder/index.html', '', '/target/'), path.resolve('/target', 'folder/index.html'));
      assert.equal(utils.computePathForCache('/script.js', '', '/target/'), path.resolve('/target', 'script.js'));
      assert.equal(utils.computePathForCache('/page.html', '?foo=bar&baz=qux', '/target/'), path.resolve('/target', 'page.foo=bar&baz=qux.html'));
    });

    const test = async (pathname, qs, req) => {
      const testRoot = await createTestRoot();

      await utils.writeToCache(pathname, qs, testRoot, req, console);
      const read = await utils.getFromCache(pathname, qs, testRoot, console);

      assert.equal(read.status, req.status);
      assert.equal(read.body, req.body.toString());
      assert.deepStrictEqual(read.headers, req.headers);

      await fse.remove(testRoot);
    };

    it('write and read cache', async () => {
      await test('/index.html', '', {
        body: '<html><body>Hello World</body></html>',
        headers: {
          'Content-Type': 'text/html',
        },
        status: 200,
      });

      await test('/folder/page', '?foo=bar&baz=qux', {
        body: '{ "p": "Hello World" }',
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      });

      await test('/not-found', '', {
        body: '',
        headers: {
          'Content-Type': 'application/json',
        },
        status: 404,
      });
    });
  });
});
