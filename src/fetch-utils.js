/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { keepAlive } from '@adobe/fetch';
import { getProxyForUrl } from 'proxy-from-env';
import nodeFetch from 'node-fetch';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

const CONTEXT_CACHE = {
  default: null,
  insecure: null,
};

/**
 * @type {ProxyHandler}
 */
const httpProxyHandler = {
  apply(target, thisArg, argArray) {
    // check if HTTP proxy is defined for the url
    const /** @type URL */ [url, init = {}] = argArray;
    const href = String(url); // ensure string
    const proxyUrl = getProxyForUrl(href);
    if (proxyUrl) {
      const agent = href.startsWith('https://')
        ? new HttpsProxyAgent(proxyUrl)
        : new HttpProxyAgent(proxyUrl);
      // eslint-disable-next-line no-console
      console.debug(`using proxy ${proxyUrl}`);
      return nodeFetch(url, {
        ...init,
        agent,
      });
    }
    return target.apply(thisArg, argArray);
  },
};

// create global context that is used by all commands and can be reset for CLI to terminate
export function getFetch(allowInsecure) {
  const cacheName = allowInsecure ? 'insecure' : 'default';
  let cache = CONTEXT_CACHE[cacheName];
  if (!cache) {
    const context = keepAlive({ rejectUnauthorized: !allowInsecure });
    cache = {
      context,
      fetch: new Proxy(context.fetch, httpProxyHandler),
    };
    CONTEXT_CACHE[cacheName] = cache;
  }
  return cache.fetch;
}

export async function resetContext() {
  await CONTEXT_CACHE.default?.context.reset();
  await CONTEXT_CACHE.insecure?.context.reset();
}
