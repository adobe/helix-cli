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

const CONTEXT_CACHE = {
  default: null,
  insecure: null,
};

// create global context that is used by all commands and can be reset for CLI to terminate
export function getFetch(rejectUnauthorized) {
  const cacheName = rejectUnauthorized ? 'insecure' : 'default';
  let context = CONTEXT_CACHE[cacheName];
  if (!context) {
    context = keepAlive({ rejectUnauthorized: false });
    CONTEXT_CACHE[cacheName] = context;
  }
  return context.fetch;
}

export async function resetContext() {
  await CONTEXT_CACHE.default?.reset();
  await CONTEXT_CACHE.insecure?.reset();
}
