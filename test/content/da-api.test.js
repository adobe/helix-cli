/*
 * Copyright 2026 Adobe. All rights reserved.
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
import { DaClient, getContentType } from '../../src/content/da-api.js';

function mockResponse(status, body, ok = status >= 200 && status < 300, responseHeaders = {}) {
  const lower = Object.fromEntries(
    Object.entries(responseHeaders).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    status,
    ok,
    statusText: ok ? 'OK' : String(status),
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    arrayBuffer: async () => Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)),
    headers: {
      get(name) {
        return lower[name.toLowerCase()] ?? null;
      },
    },
  };
}

describe('getContentType', () => {
  it('returns text/html for html', () => {
    assert.strictEqual(getContentType('html'), 'text/html');
  });

  it('returns application/json for json', () => {
    assert.strictEqual(getContentType('json'), 'application/json');
  });

  it('returns image/svg+xml for svg', () => {
    assert.strictEqual(getContentType('svg'), 'image/svg+xml');
  });

  it('returns image/png for png', () => {
    assert.strictEqual(getContentType('png'), 'image/png');
  });

  it('returns image/jpeg for jpg', () => {
    assert.strictEqual(getContentType('jpg'), 'image/jpeg');
  });

  it('returns image/jpeg for jpeg', () => {
    assert.strictEqual(getContentType('jpeg'), 'image/jpeg');
  });

  it('returns image/gif for gif', () => {
    assert.strictEqual(getContentType('gif'), 'image/gif');
  });

  it('returns image/webp for webp', () => {
    assert.strictEqual(getContentType('webp'), 'image/webp');
  });

  it('returns application/pdf for pdf', () => {
    assert.strictEqual(getContentType('pdf'), 'application/pdf');
  });

  it('returns application/octet-stream for unknown extension', () => {
    assert.strictEqual(getContentType('zzzunknown'), 'application/octet-stream');
  });

  it('is case-insensitive', () => {
    assert.strictEqual(getContentType('HTML'), 'text/html');
    assert.strictEqual(getContentType('PNG'), 'image/png');
  });

  it('returns application/octet-stream for undefined', () => {
    assert.strictEqual(getContentType(undefined), 'application/octet-stream');
  });

  it('returns application/octet-stream for null', () => {
    assert.strictEqual(getContentType(null), 'application/octet-stream');
  });
});

describe('DaClient', () => {
  let client;

  beforeEach(() => {
    client = new DaClient('test-token');
  });

  describe('authHeader', () => {
    it('returns Authorization Bearer header', () => {
      assert.deepStrictEqual(client.authHeader, { Authorization: 'Bearer test-token' });
    });
  });

  describe('list', () => {
    it('returns parsed JSON on success', async () => {
      const items = [{ path: '/org/repo/file.html', name: 'file.html', ext: 'html' }];
      client.fetch = async () => mockResponse(200, items);
      const result = await client.list('org', 'repo', '/');
      assert.deepStrictEqual(result, items);
    });

    it('calls the correct URL', async () => {
      let calledUrl;
      client.fetch = async (url) => {
        calledUrl = url;
        return mockResponse(200, []);
      };
      await client.list('myorg', 'myrepo', '/some/path');
      assert.strictEqual(calledUrl, 'https://admin.da.live/list/myorg/myrepo/some/path');
    });

    it('passes auth header', async () => {
      let calledHeaders;
      client.fetch = async (url, opts) => {
        calledHeaders = opts.headers;
        return mockResponse(200, []);
      };
      await client.list('org', 'repo', '/');
      assert.deepStrictEqual(calledHeaders, { Authorization: 'Bearer test-token' });
    });

    it('throws Unauthorized on 401', async () => {
      client.fetch = async () => mockResponse(401, 'Unauthorized', false);
      await assert.rejects(() => client.list('org', 'repo', '/'), /Unauthorized/);
    });

    it('throws on non-ok status', async () => {
      client.fetch = async () => mockResponse(500, 'Server Error', false);
      await assert.rejects(() => client.list('org', 'repo', '/'), /List failed/);
    });

    it('follows da-continuation-token until no further pages', async () => {
      let calls = 0;
      client.fetch = async (url, opts) => {
        calls += 1;
        if (calls === 1) {
          assert.strictEqual(opts.headers.Authorization, 'Bearer test-token');
          assert.strictEqual(opts.headers['da-continuation-token'], undefined);
          return mockResponse(
            200,
            [{ path: '/org/repo/a.html', name: 'a.html', ext: 'html' }],
            true,
            { 'da-continuation-token': 'page2token' },
          );
        }
        assert.strictEqual(opts.headers['da-continuation-token'], 'page2token');
        return mockResponse(200, [{ path: '/org/repo/b.html', name: 'b.html', ext: 'html' }], true, {});
      };
      const result = await client.list('org', 'repo', '/');
      assert.strictEqual(calls, 2);
      assert.strictEqual(result.length, 2);
      assert.ok(result.some((i) => i.path === '/org/repo/a.html'));
      assert.ok(result.some((i) => i.path === '/org/repo/b.html'));
    });
  });

  describe('listAll', () => {
    it('returns files directly for flat structure', async () => {
      const items = [
        { path: '/org/repo/a.html', name: 'a.html', ext: 'html' },
        { path: '/org/repo/b.html', name: 'b.html', ext: 'html' },
      ];
      client.list = async () => items;
      const result = await client.listAll('org', 'repo', '/');
      assert.deepStrictEqual(result, items);
    });

    it('recurses into folders', async () => {
      client.list = async (org, repo, daPath) => {
        if (daPath === '/') {
          return [
            { path: '/org/repo/file.html', name: 'file.html', ext: 'html' },
            { path: '/org/repo/sub', name: 'sub' },
          ];
        }
        if (daPath === '/sub') {
          return [{ path: '/org/repo/sub/page.html', name: 'page.html', ext: 'html' }];
        }
        return [];
      };
      const result = await client.listAll('org', 'repo', '/');
      assert.strictEqual(result.length, 2);
      assert.ok(result.some((f) => f.path === '/org/repo/file.html'));
      assert.ok(result.some((f) => f.path === '/org/repo/sub/page.html'));
    });

    it('returns empty array for empty directory', async () => {
      client.list = async () => [];
      const result = await client.listAll('org', 'repo', '/');
      assert.deepStrictEqual(result, []);
    });

    it('strips org/repo prefix when computing subfolder path', async () => {
      const listedPaths = [];
      client.list = async (org, repo, daPath) => {
        listedPaths.push(daPath);
        if (daPath === '/') {
          return [{ path: '/org/repo/nested', name: 'nested' }];
        }
        return [];
      };
      await client.listAll('org', 'repo', '/');
      assert.ok(listedPaths.includes('/nested'));
    });

    it('invokes onDiscovered with cumulative count for each file', async () => {
      const counts = [];
      client.list = async (org, repo, daPath) => {
        if (daPath === '/') {
          return [
            { path: '/org/repo/a.html', name: 'a.html', ext: 'html' },
            { path: '/org/repo/sub', name: 'sub' },
          ];
        }
        if (daPath === '/sub') {
          return [
            { path: '/org/repo/sub/b.html', name: 'b.html', ext: 'html' },
            { path: '/org/repo/sub/c.html', name: 'c.html', ext: 'html' },
          ];
        }
        return [];
      };
      await client.listAll('org', 'repo', '/', (n) => counts.push(n));
      assert.deepStrictEqual(counts, [1, 2, 3]);
    });
  });

  describe('getSource', () => {
    it('returns response on success', async () => {
      const resp = mockResponse(200, '<html></html>');
      client.fetch = async () => resp;
      const result = await client.getSource('org', 'repo', '/file.html');
      assert.strictEqual(result, resp);
    });

    it('returns null on 404', async () => {
      client.fetch = async () => mockResponse(404, 'Not Found', false);
      const result = await client.getSource('org', 'repo', '/missing.html');
      assert.strictEqual(result, null);
    });

    it('throws Unauthorized on 401', async () => {
      client.fetch = async () => mockResponse(401, 'Unauthorized', false);
      await assert.rejects(() => client.getSource('org', 'repo', '/file.html'), /Unauthorized/);
    });

    it('throws on non-ok, non-404 status', async () => {
      client.fetch = async () => mockResponse(500, 'Error', false);
      await assert.rejects(() => client.getSource('org', 'repo', '/file.html'), /GET failed/);
    });

    it('calls correct source URL', async () => {
      let calledUrl;
      client.fetch = async (url) => {
        calledUrl = url;
        return mockResponse(200, '');
      };
      await client.getSource('org', 'repo', '/path/to/file.html');
      assert.strictEqual(calledUrl, 'https://admin.da.live/source/org/repo/path/to/file.html');
    });
  });

  describe('putSource', () => {
    it('returns parsed JSON on success', async () => {
      const responseBody = { status: 'ok' };
      client.fetch = async () => mockResponse(200, responseBody);
      const result = await client.putSource('org', 'repo', '/file.html', Buffer.from('<html>'), 'text/html');
      assert.deepStrictEqual(result, responseBody);
    });

    it('sends PUT request', async () => {
      let method;
      client.fetch = async (url, opts) => {
        method = opts.method;
        return mockResponse(200, {});
      };
      await client.putSource('org', 'repo', '/file.html', Buffer.from(''), 'text/html');
      assert.strictEqual(method, 'PUT');
    });

    it('calls correct source URL', async () => {
      let calledUrl;
      client.fetch = async (url) => {
        calledUrl = url;
        return mockResponse(200, {});
      };
      await client.putSource('org', 'repo', '/page.html', Buffer.from(''), 'text/html');
      assert.strictEqual(calledUrl, 'https://admin.da.live/source/org/repo/page.html');
    });

    it('throws Unauthorized on 401', async () => {
      client.fetch = async () => mockResponse(401, 'Unauthorized', false);
      await assert.rejects(
        () => client.putSource('org', 'repo', '/file.html', Buffer.from(''), 'text/html'),
        /Unauthorized/,
      );
    });

    it('throws on non-ok status', async () => {
      client.fetch = async () => mockResponse(500, 'Error', false);
      await assert.rejects(
        () => client.putSource('org', 'repo', '/file.html', Buffer.from(''), 'text/html'),
        /PUT failed/,
      );
    });
  });

  describe('deleteSource', () => {
    it('returns true on ok response', async () => {
      client.fetch = async () => mockResponse(200, 'deleted');
      const result = await client.deleteSource('org', 'repo', '/file.html');
      assert.strictEqual(result, true);
    });

    it('returns true on 204', async () => {
      client.fetch = async () => ({ status: 204, ok: false });
      const result = await client.deleteSource('org', 'repo', '/file.html');
      assert.strictEqual(result, true);
    });

    it('sends DELETE request', async () => {
      let method;
      client.fetch = async (url, opts) => {
        method = opts.method;
        return mockResponse(200, '');
      };
      await client.deleteSource('org', 'repo', '/file.html');
      assert.strictEqual(method, 'DELETE');
    });

    it('throws Unauthorized on 401', async () => {
      client.fetch = async () => mockResponse(401, 'Unauthorized', false);
      await assert.rejects(() => client.deleteSource('org', 'repo', '/file.html'), /Unauthorized/);
    });

    it('calls correct source URL', async () => {
      let calledUrl;
      client.fetch = async (url) => {
        calledUrl = url;
        return mockResponse(200, '');
      };
      await client.deleteSource('org', 'repo', '/dir/file.html');
      assert.strictEqual(calledUrl, 'https://admin.da.live/source/org/repo/dir/file.html');
    });
  });

  describe('getRemoteLastModified', () => {
    it('returns parsed lastModified from last-modified header', async () => {
      const date = 'Tue, 01 Jan 2025 00:00:00 GMT';
      client.fetch = async () => mockResponse(200, '', true, { 'last-modified': date });
      const result = await client.getRemoteLastModified('org', 'repo', '/file.html');
      assert.strictEqual(result, new Date(date).getTime());
    });

    it('returns null when last-modified header is absent', async () => {
      client.fetch = async () => mockResponse(200, '', true, {});
      const result = await client.getRemoteLastModified('org', 'repo', '/file.html');
      assert.strictEqual(result, null);
    });

    it('returns null on 404', async () => {
      client.fetch = async () => mockResponse(404, '', false);
      const result = await client.getRemoteLastModified('org', 'repo', '/missing.html');
      assert.strictEqual(result, null);
    });

    it('throws Unauthorized on 401', async () => {
      client.fetch = async () => mockResponse(401, '', false);
      await assert.rejects(() => client.getRemoteLastModified('org', 'repo', '/file.html'), /Unauthorized/);
    });

    it('sends HEAD request to correct source URL', async () => {
      let method;
      let calledUrl;
      client.fetch = async (url, opts) => {
        method = opts.method;
        calledUrl = url;
        return mockResponse(200, '', true, {});
      };
      await client.getRemoteLastModified('org', 'repo', '/path/to/file.html');
      assert.strictEqual(method, 'HEAD');
      assert.strictEqual(calledUrl, 'https://admin.da.live/source/org/repo/path/to/file.html');
    });

    it('passes auth header', async () => {
      let calledHeaders;
      client.fetch = async (_url, opts) => {
        calledHeaders = opts.headers;
        return mockResponse(200, '', true, {});
      };
      await client.getRemoteLastModified('org', 'repo', '/file.html');
      assert.deepStrictEqual(calledHeaders, { Authorization: 'Bearer test-token' });
    });
  });
});
