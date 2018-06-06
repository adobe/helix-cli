/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
const fs = require('fs-extra');
const util = require('util');
const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);
const request = require('request-promise');

const {Compiler} = require('htlengine');
const {converter} = require('md2json');

const utils = {

    /**
     * Checks if the file addressed by the given filename exists and is a regular file.
     * @param {String} filename Path to file
     * @returns {Promise} Returns promise that resolves with the filename or rejects if is not a file.
     */
    isFile: function(filename) {
        return stat(filename)
            .then(stats => {
                if (!stats.isFile()) {
                    console.log('resolved path no regular file: %j', stats);
                    return Promise.reject(new Error('no regular file'));
                }
                return filename;
            });
    },

    /**
     * Fetches content from the given uri.
     * @param {String} uri Either filesystem path (starting with '/') or URL
     * @returns {*} The requested content
     */
    fetch: function(uri) {
        console.debug('Fetching...', uri);
        if (uri.charAt(0) === '/') {
            return readFile(uri);
        }
        return request(uri);
    },

    /**
     * Fetches the content and stores it in the context.
     * @param {RequestContext} ctx Context
     * @return {Promise} A promise that resolves to the request context.
     */
    fetchContent: function(ctx) {
        const uri = ctx.strainConfig.content + ctx.resourcePath + ('html' === ctx.extension ? '.md' : '.' + ctx.extension);
        return utils.fetch(uri).then(data => {
            ctx.content = data.toString();
            return ctx;
        });
    },

    collectMetadata: function(ctx) {
        // const options = {
        //     uri:
        //         ctx.strainConfig.api + 
        //         '/commits?path=' + 
        //         ctx.resourcePath + '.md',
        //     headers: {
        //         'User-Agent': 'Request-Promise'
        //     },
        //     json: true
        // };

        // return request(options).then(metadata => {
        //     ctx.resource.metadata = metadata;
        //     return ctx;
        // });

        // TODO: remove temp solution - WIP
        ctx.resource.metadata = METADATA;
        return Promise.resolve(ctx);
    },

    /**
     * Converts the markdown content into JSON and stores it in the context.
     * @param {RequestContext} ctx Context
     * @return {Promise} A promise that resolves to the request context.
     */
    convertContent: function(ctx) {
        return converter.convert(ctx.content).then(json => {
            ctx.resource = json;
            return ctx;
        });
    },

    /**
     * Fetches a resource in the code repo.
     * @param {RequestContext} ctx Context
     * @return {Promise} A promise that resolves to the request.
     */
    fetchCode: function(ctx) {
        const uri = ctx.strainConfig.code + ctx.path;
        return utils.fetch(uri).then(data => {
            ctx.code = data.toString();
            return ctx;
        });
    },

    /**
    /**
     * Fetches the code based on the template and stores it in the context.
     * @param {RequestContext} ctx Context
     * @return {Promise} A promise that resolves to the request context.
     */
    fetchTemplate: function(ctx) {
        ctx.templateName = ctx.resource.meta && ctx.resource.meta.template ? ctx.resource.meta.template : 'default' ;
        const uri = ctx.strainConfig.code + '/' + ctx.templateName + '.htl';
        return utils.fetch(uri).then(data => {
            ctx.code = data.toString();
            return ctx;
        });
    },

    /**
     * Compiles the template and stores the compiled filepath in the context
     * @param {RequestContext} ctx Context
     * @return {Promise} A promise that resolves to the request context.
     */
    compileHtlTemplate: function(ctx) {
        // console.log('Compiling ' + options.templatePath);
        fs.mkdirpSync(ctx.strainConfig.cache);
        const compiler = new Compiler()
            .withOutputDirectory(ctx.strainConfig.cache)
            .includeRuntime(true)
            .withRuntimeGlobalName('it');

        ctx.compiledTemplate = compiler.compile(ctx.code, ctx.templateName + '.js');
        return ctx;
    },

    /**
     * Executes the template and resolves with the content.
     * @param {RequestContext} ctx Context
     * @return {Promise} A promise that resolves to generated output.
     */
    executeTemplate: function(ctx) {
        delete require.cache[require.resolve(ctx.compiledTemplate)];
        const mod = require(ctx.compiledTemplate);
        return Promise.resolve(mod.main(ctx.resource));
    }
};

module.exports = Object.freeze(utils);

const METADATA = [
    {
        "sha": "2e35c37d17ece69ee4ab555151009326ed9834c5",
        "node_id": "MDY6Q29tbWl0MTMxMDU3MTQ1OjJlMzVjMzdkMTdlY2U2OWVlNGFiNTU1MTUxMDA5MzI2ZWQ5ODM0YzU=",
        "commit": {
            "author": {
                "name": "Aaron Hardy",
                "email": "aaron@aaronhardy.com",
                "date": "2018-05-30T22:37:45Z"
            },
            "committer": {
                "name": "gitbook-bot",
                "email": "ghost@gitbook.com",
                "date": "2018-05-30T22:37:45Z"
            },
            "message": "GitBook: [master] one page modified",
            "tree": {
                "sha": "2a376b4ec8d0e9a9c810e03e7676acf2b333769b",
                "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/git/trees/2a376b4ec8d0e9a9c810e03e7676acf2b333769b"
            },
            "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/git/commits/2e35c37d17ece69ee4ab555151009326ed9834c5",
            "comment_count": 0,
            "verification": {
                "verified": true,
                "reason": "valid",
                "signature": "-----BEGIN PGP SIGNATURE-----\nVersion: OpenPGP.js v2.6.2\nComment: https://openpgpjs.org\n\nwsFcBAABCAAQBQJbDye6CRAH0hgMexLQ/wAA1okP/2CeXmhVZ0K2D7dm3AmW\n6nW8q5t72tmKeDt6Z+Qs52IRCjrgQgshLzZT69LV++gaisY9rqXOZrhcgGWJ\npyQf+p8sMjZzjtHftKKW5Jmwa229flTIPsbRfujb1D98nunv7rhOFgTVShoK\n9Rt900oye3aYaDAPah9NNGkbwIEOgpOwzn3ekNzZBOOWySAH9bHSfqg1OY1l\nsh3JE6yDF1HWvFVjyqnyZ5oo0DJ8PLevAzyKsc0LA92wkbQAaO3wMYhSVBlY\nYV4Q2Tkp5bwjDb9H4tguqrfuIyt55tUpBPMydjn/29AYFguDOdV0HkZu7msM\n9MYEy/fuDSrrTNxVZc7Hg3jUhPkyQTFjyiWdUIx/vLuR4984Ol8BBIk6pyx1\nwTVgG95a8AZKIvLIY0Gbp5KXspeNTLTM7fZcVLOHvzBGxhTDjK7a7qWbIEmr\nqYSaYViqLPNbJTI/D4MGvhqyr1kNJ//bIuDGkvdzNu7DxyhrLRmcn1MQYZ/D\n+fwPeJ4Vc5Muqd0ZuLszqcTpWDgLOyCB6jooiBPrBWz/V4byDn3tG/WVBrU/\nUOE5cOWikyWPiyQPvUVPteO36Dxmq66Vdr5jhjIHyrx5w4M4XssUc5X2GJL9\nJMT+4zGu8CJ6dN+H0R63AiIRu87bgWD/VlPcePNowqLnkEPsPLolitx2wFzh\n8ZRy\n=YaFJ\n-----END PGP SIGNATURE-----",
                "payload": "tree 2a376b4ec8d0e9a9c810e03e7676acf2b333769b\nparent 6dddcc54c2d9b9edca638d24bfad873c3fee0ec0\nauthor Aaron Hardy <aaron@aaronhardy.com> 1527719865 +0000\ncommitter gitbook-bot <ghost@gitbook.com> 1527719865 +0000\n\nGitBook: [master] one page modified"
            }
        },
        "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/commits/2e35c37d17ece69ee4ab555151009326ed9834c5",
        "html_url": "https://github.com/Adobe-Marketing-Cloud/reactor-user-docs/commit/2e35c37d17ece69ee4ab555151009326ed9834c5",
        "comments_url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/commits/2e35c37d17ece69ee4ab555151009326ed9834c5/comments",
        "author": {
            "login": "Aaronius",
            "id": 210820,
            "node_id": "MDQ6VXNlcjIxMDgyMA==",
            "avatar_url": "https://avatars1.githubusercontent.com/u/210820?v=4",
            "gravatar_id": "",
            "url": "https://api.github.com/users/Aaronius",
            "html_url": "https://github.com/Aaronius",
            "followers_url": "https://api.github.com/users/Aaronius/followers",
            "following_url": "https://api.github.com/users/Aaronius/following{/other_user}",
            "gists_url": "https://api.github.com/users/Aaronius/gists{/gist_id}",
            "starred_url": "https://api.github.com/users/Aaronius/starred{/owner}{/repo}",
            "subscriptions_url": "https://api.github.com/users/Aaronius/subscriptions",
            "organizations_url": "https://api.github.com/users/Aaronius/orgs",
            "repos_url": "https://api.github.com/users/Aaronius/repos",
            "events_url": "https://api.github.com/users/Aaronius/events{/privacy}",
            "received_events_url": "https://api.github.com/users/Aaronius/received_events",
            "type": "User",
            "site_admin": false
        },
        "committer": {
            "login": "gitbook-bot",
            "id": 31919211,
            "node_id": "MDQ6VXNlcjMxOTE5MjEx",
            "avatar_url": "https://avatars2.githubusercontent.com/u/31919211?v=4",
            "gravatar_id": "",
            "url": "https://api.github.com/users/gitbook-bot",
            "html_url": "https://github.com/gitbook-bot",
            "followers_url": "https://api.github.com/users/gitbook-bot/followers",
            "following_url": "https://api.github.com/users/gitbook-bot/following{/other_user}",
            "gists_url": "https://api.github.com/users/gitbook-bot/gists{/gist_id}",
            "starred_url": "https://api.github.com/users/gitbook-bot/starred{/owner}{/repo}",
            "subscriptions_url": "https://api.github.com/users/gitbook-bot/subscriptions",
            "organizations_url": "https://api.github.com/users/gitbook-bot/orgs",
            "repos_url": "https://api.github.com/users/gitbook-bot/repos",
            "events_url": "https://api.github.com/users/gitbook-bot/events{/privacy}",
            "received_events_url": "https://api.github.com/users/gitbook-bot/received_events",
            "type": "User",
            "site_admin": false
        },
        "parents": [
            {
                "sha": "6dddcc54c2d9b9edca638d24bfad873c3fee0ec0",
                "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/commits/6dddcc54c2d9b9edca638d24bfad873c3fee0ec0",
                "html_url": "https://github.com/Adobe-Marketing-Cloud/reactor-user-docs/commit/6dddcc54c2d9b9edca638d24bfad873c3fee0ec0"
            }
        ]
    },
    {
        "sha": "8bece5ffa757dfe5a19e6b3792425c1d82c33f5b",
        "node_id": "MDY6Q29tbWl0MTMxMDU3MTQ1OjhiZWNlNWZmYTc1N2RmZTVhMTllNmIzNzkyNDI1YzFkODJjMzNmNWI=",
        "commit": {
            "author": {
                "name": "Aaron Hardy",
                "email": "aaron@aaronhardy.com",
                "date": "2018-04-25T21:40:36Z"
            },
            "committer": {
                "name": "gitbook-bot",
                "email": "ghost@gitbook.com",
                "date": "2018-04-25T21:40:36Z"
            },
            "message": "GitBook: [master] 17 pages modified",
            "tree": {
                "sha": "890cb71d69f1e8e74cb86360c3f3394088c0ac69",
                "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/git/trees/890cb71d69f1e8e74cb86360c3f3394088c0ac69"
            },
            "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/git/commits/8bece5ffa757dfe5a19e6b3792425c1d82c33f5b",
            "comment_count": 0,
            "verification": {
                "verified": true,
                "reason": "valid",
                "signature": "-----BEGIN PGP SIGNATURE-----\nVersion: OpenPGP.js v2.6.2\nComment: https://openpgpjs.org\n\nwsFcBAABCAAQBQJa4PXVCRAH0hgMexLQ/wAAJ4EP/0bGs+7Y3eAQmDx+KHXY\nUJQVVZGb4vWVJfwsrX5XvETrZIW8ikrMughro5/KJuUSYgTAnoK8rt2+qXBt\n+OQuerJG03vbvVPzFEPfKCOOI6SGqMxyMfFw97YFoPpkCQK/Tckj6Vl534Mw\nzHnNm0wAO9U2qQSaoiwNwB4DMoXsWOoDAtfZM8uC2dVq6T/MEOIHtYw5V8Wf\nvcxKtqBZlOV6grV6dr/Rx2A0mmizz97yuDVK8BpjCpMkPDodwtr2va059Xdz\nXN48HKaM2Y4SgtPNK8ax/q002FwEWVTlFBmtJARK7iGGlAH+RSRPApBQ+x7L\nw6dV8v3r75cJ8bPbqMqIP3piLyPXOcVFhIo4a3REXauQ3TVMil9hTdKC3nb+\n3LAMlxlK6KALfo5Tq2uCzlhYB39Tid01tmuTz3cFShUEcOU5NX/ta5tHpAWg\n9EPNK+bvLC2i+7Unz1/tGIX8Jj21G8/5NpZHctV2GEgmiDUVie/wfMAfI2Wa\nj9bUQi4oz9ZVrlGHZugcDIy+t3O2N5qVcEaKkZqnpQTwa8AMBAuoB7VeQnD/\nnI+A22uZv2hHnCPHmdcrp8rnFS71fBrSq79Om9irZV7jaBItRveHh5YUTULR\nkWVYf5wCrAhthZKyiAefaZZ8xeaLtBafepVM3ZW0txk71n9tIsmI+j7I4CgX\nZGU7\n=VLgg\n-----END PGP SIGNATURE-----",
                "payload": "tree 890cb71d69f1e8e74cb86360c3f3394088c0ac69\nparent a452aaa66a36ecfed4bac57b1772c10825033ba2\nauthor Aaron Hardy <aaron@aaronhardy.com> 1524692436 +0000\ncommitter gitbook-bot <ghost@gitbook.com> 1524692436 +0000\n\nGitBook: [master] 17 pages modified"
            }
        },
        "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/commits/8bece5ffa757dfe5a19e6b3792425c1d82c33f5b",
        "html_url": "https://github.com/Adobe-Marketing-Cloud/reactor-user-docs/commit/8bece5ffa757dfe5a19e6b3792425c1d82c33f5b",
        "comments_url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/commits/8bece5ffa757dfe5a19e6b3792425c1d82c33f5b/comments",
        "author": {
            "login": "Aaronius",
            "id": 210820,
            "node_id": "MDQ6VXNlcjIxMDgyMA==",
            "avatar_url": "https://avatars1.githubusercontent.com/u/210820?v=4",
            "gravatar_id": "",
            "url": "https://api.github.com/users/Aaronius",
            "html_url": "https://github.com/Aaronius",
            "followers_url": "https://api.github.com/users/Aaronius/followers",
            "following_url": "https://api.github.com/users/Aaronius/following{/other_user}",
            "gists_url": "https://api.github.com/users/Aaronius/gists{/gist_id}",
            "starred_url": "https://api.github.com/users/Aaronius/starred{/owner}{/repo}",
            "subscriptions_url": "https://api.github.com/users/Aaronius/subscriptions",
            "organizations_url": "https://api.github.com/users/Aaronius/orgs",
            "repos_url": "https://api.github.com/users/Aaronius/repos",
            "events_url": "https://api.github.com/users/Aaronius/events{/privacy}",
            "received_events_url": "https://api.github.com/users/Aaronius/received_events",
            "type": "User",
            "site_admin": false
        },
        "committer": {
            "login": "gitbook-bot",
            "id": 31919211,
            "node_id": "MDQ6VXNlcjMxOTE5MjEx",
            "avatar_url": "https://avatars2.githubusercontent.com/u/31919211?v=4",
            "gravatar_id": "",
            "url": "https://api.github.com/users/gitbook-bot",
            "html_url": "https://github.com/gitbook-bot",
            "followers_url": "https://api.github.com/users/gitbook-bot/followers",
            "following_url": "https://api.github.com/users/gitbook-bot/following{/other_user}",
            "gists_url": "https://api.github.com/users/gitbook-bot/gists{/gist_id}",
            "starred_url": "https://api.github.com/users/gitbook-bot/starred{/owner}{/repo}",
            "subscriptions_url": "https://api.github.com/users/gitbook-bot/subscriptions",
            "organizations_url": "https://api.github.com/users/gitbook-bot/orgs",
            "repos_url": "https://api.github.com/users/gitbook-bot/repos",
            "events_url": "https://api.github.com/users/gitbook-bot/events{/privacy}",
            "received_events_url": "https://api.github.com/users/gitbook-bot/received_events",
            "type": "User",
            "site_admin": false
        },
        "parents": [
            {
                "sha": "a452aaa66a36ecfed4bac57b1772c10825033ba2",
                "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/commits/a452aaa66a36ecfed4bac57b1772c10825033ba2",
                "html_url": "https://github.com/Adobe-Marketing-Cloud/reactor-user-docs/commit/a452aaa66a36ecfed4bac57b1772c10825033ba2"
            }
        ]
    },
    {
        "sha": "67a59a7519514467a713016adfe46d999fe330d8",
        "node_id": "MDY6Q29tbWl0MTMxMDU3MTQ1OjY3YTU5YTc1MTk1MTQ0NjdhNzEzMDE2YWRmZTQ2ZDk5OWZlMzMwZDg=",
        "commit": {
            "author": {
                "name": "Aaron Hardy",
                "email": "aahardy@adobe.com",
                "date": "2018-04-25T21:31:25Z"
            },
            "committer": {
                "name": "Aaron Hardy",
                "email": "aahardy@adobe.com",
                "date": "2018-04-25T21:31:25Z"
            },
            "message": "Fixing internal links.",
            "tree": {
                "sha": "50acfbe1bb77fad0b39dafd987d71f790509847e",
                "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/git/trees/50acfbe1bb77fad0b39dafd987d71f790509847e"
            },
            "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/git/commits/67a59a7519514467a713016adfe46d999fe330d8",
            "comment_count": 0,
            "verification": {
                "verified": false,
                "reason": "unsigned",
                "signature": null,
                "payload": null
            }
        },
        "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/commits/67a59a7519514467a713016adfe46d999fe330d8",
        "html_url": "https://github.com/Adobe-Marketing-Cloud/reactor-user-docs/commit/67a59a7519514467a713016adfe46d999fe330d8",
        "comments_url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/commits/67a59a7519514467a713016adfe46d999fe330d8/comments",
        "author": {
            "login": "Aaronius",
            "id": 210820,
            "node_id": "MDQ6VXNlcjIxMDgyMA==",
            "avatar_url": "https://avatars1.githubusercontent.com/u/210820?v=4",
            "gravatar_id": "",
            "url": "https://api.github.com/users/Aaronius",
            "html_url": "https://github.com/Aaronius",
            "followers_url": "https://api.github.com/users/Aaronius/followers",
            "following_url": "https://api.github.com/users/Aaronius/following{/other_user}",
            "gists_url": "https://api.github.com/users/Aaronius/gists{/gist_id}",
            "starred_url": "https://api.github.com/users/Aaronius/starred{/owner}{/repo}",
            "subscriptions_url": "https://api.github.com/users/Aaronius/subscriptions",
            "organizations_url": "https://api.github.com/users/Aaronius/orgs",
            "repos_url": "https://api.github.com/users/Aaronius/repos",
            "events_url": "https://api.github.com/users/Aaronius/events{/privacy}",
            "received_events_url": "https://api.github.com/users/Aaronius/received_events",
            "type": "User",
            "site_admin": false
        },
        "committer": {
            "login": "Aaronius",
            "id": 210820,
            "node_id": "MDQ6VXNlcjIxMDgyMA==",
            "avatar_url": "https://avatars1.githubusercontent.com/u/210820?v=4",
            "gravatar_id": "",
            "url": "https://api.github.com/users/Aaronius",
            "html_url": "https://github.com/Aaronius",
            "followers_url": "https://api.github.com/users/Aaronius/followers",
            "following_url": "https://api.github.com/users/Aaronius/following{/other_user}",
            "gists_url": "https://api.github.com/users/Aaronius/gists{/gist_id}",
            "starred_url": "https://api.github.com/users/Aaronius/starred{/owner}{/repo}",
            "subscriptions_url": "https://api.github.com/users/Aaronius/subscriptions",
            "organizations_url": "https://api.github.com/users/Aaronius/orgs",
            "repos_url": "https://api.github.com/users/Aaronius/repos",
            "events_url": "https://api.github.com/users/Aaronius/events{/privacy}",
            "received_events_url": "https://api.github.com/users/Aaronius/received_events",
            "type": "User",
            "site_admin": false
        },
        "parents": [
            {
                "sha": "39f0b1e684329005e5cfe72de377af1f3f5de2d7",
                "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/commits/39f0b1e684329005e5cfe72de377af1f3f5de2d7",
                "html_url": "https://github.com/Adobe-Marketing-Cloud/reactor-user-docs/commit/39f0b1e684329005e5cfe72de377af1f3f5de2d7"
            }
        ]
    },
    {
        "sha": "36e62ad003ec115c2938889a964a5d1c26ef9fcf",
        "node_id": "MDY6Q29tbWl0MTMxMDU3MTQ1OjM2ZTYyYWQwMDNlYzExNWMyOTM4ODg5YTk2NGE1ZDFjMjZlZjlmY2Y=",
        "commit": {
            "author": {
                "name": "Aaron Hardy",
                "email": "aaron@aaronhardy.com",
                "date": "2018-04-25T20:04:12Z"
            },
            "committer": {
                "name": "gitbook-bot",
                "email": "ghost@gitbook.com",
                "date": "2018-04-25T20:04:12Z"
            },
            "message": "GitBook: [master] 30 pages modified",
            "tree": {
                "sha": "b2558da93aad70a5b2b8c6f2fa613d508fba93fe",
                "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/git/trees/b2558da93aad70a5b2b8c6f2fa613d508fba93fe"
            },
            "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/git/commits/36e62ad003ec115c2938889a964a5d1c26ef9fcf",
            "comment_count": 0,
            "verification": {
                "verified": true,
                "reason": "valid",
                "signature": "-----BEGIN PGP SIGNATURE-----\nVersion: OpenPGP.js v2.6.2\nComment: https://openpgpjs.org\n\nwsFcBAABCAAQBQJa4N89CRAH0hgMexLQ/wAAo8sP/jGtY8ObQRPTrjk6AXhV\nUaQ84lF1Zeai3iGlPcju+fFV9W4gBa/AADGsQ5w4fz6nVbf1HG9+jwZ29pFg\nABI13eZVWND54MWltwGnwfnHFY9qCp+WItuOwZlzYi74445wsWARnM37Jebn\nQxUU0d3MtU9mBmNl03juVCuaPZ+rFToQCC/vp/3rgRbRQa79LxouNFk1nDw8\nqnKuzUsbGrqOtzim05SgTqJTAN6pcpRLN/987CtdbZfTDYhxFgtfHrd8Y0je\nAcR/HW3kD4apWwu97ELmGBCn1DzmbnbEYBH3W5VuKJz12WSeE+VFEUX+yMjB\n8bz/F9VcmAIpMeIOAULlvV0sp7XsKcqdHtCCO2DcfI2aZwpZQl/z/aYDoqBt\nwCll7sXzdkcZsOMIdlNAvy09EfQ/n8hkvVJyqFW2TNK2hLPH4OkYDomwYcmL\ngi2enLsMoFvjupFRV+o1x4EP9A86kDEjCSpUu6IsBZcxUprOyKHDkaPi1mec\ngk10V82TQY6//cjJA5LKGBGi7sJAbGWb3Ffr4K3Gi/fNizHxdWfpq7mMMW1p\npVrpqg0H1bYsz7TYxbWUwaD/QDEoBfltsy2yHgf/0ZAAB9P+S+tbg1HWbwvQ\nRX8mxVUqReH5R0j4OcS1O+Ijht7V/alBNgDYTVEe3xHQXjR3HLB2LF0IMto8\nHRt5\n=nzjt\n-----END PGP SIGNATURE-----",
                "payload": "tree b2558da93aad70a5b2b8c6f2fa613d508fba93fe\nparent eb2e1a8288f84dd5e253129cb7e080f7c08cfd82\nauthor Aaron Hardy <aaron@aaronhardy.com> 1524686652 +0000\ncommitter gitbook-bot <ghost@gitbook.com> 1524686652 +0000\n\nGitBook: [master] 30 pages modified"
            }
        },
        "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/commits/36e62ad003ec115c2938889a964a5d1c26ef9fcf",
        "html_url": "https://github.com/Adobe-Marketing-Cloud/reactor-user-docs/commit/36e62ad003ec115c2938889a964a5d1c26ef9fcf",
        "comments_url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/commits/36e62ad003ec115c2938889a964a5d1c26ef9fcf/comments",
        "author": {
            "login": "Aaronius",
            "id": 210820,
            "node_id": "MDQ6VXNlcjIxMDgyMA==",
            "avatar_url": "https://avatars1.githubusercontent.com/u/210820?v=4",
            "gravatar_id": "",
            "url": "https://api.github.com/users/Aaronius",
            "html_url": "https://github.com/Aaronius",
            "followers_url": "https://api.github.com/users/Aaronius/followers",
            "following_url": "https://api.github.com/users/Aaronius/following{/other_user}",
            "gists_url": "https://api.github.com/users/Aaronius/gists{/gist_id}",
            "starred_url": "https://api.github.com/users/Aaronius/starred{/owner}{/repo}",
            "subscriptions_url": "https://api.github.com/users/Aaronius/subscriptions",
            "organizations_url": "https://api.github.com/users/Aaronius/orgs",
            "repos_url": "https://api.github.com/users/Aaronius/repos",
            "events_url": "https://api.github.com/users/Aaronius/events{/privacy}",
            "received_events_url": "https://api.github.com/users/Aaronius/received_events",
            "type": "User",
            "site_admin": false
        },
        "committer": {
            "login": "gitbook-bot",
            "id": 31919211,
            "node_id": "MDQ6VXNlcjMxOTE5MjEx",
            "avatar_url": "https://avatars2.githubusercontent.com/u/31919211?v=4",
            "gravatar_id": "",
            "url": "https://api.github.com/users/gitbook-bot",
            "html_url": "https://github.com/gitbook-bot",
            "followers_url": "https://api.github.com/users/gitbook-bot/followers",
            "following_url": "https://api.github.com/users/gitbook-bot/following{/other_user}",
            "gists_url": "https://api.github.com/users/gitbook-bot/gists{/gist_id}",
            "starred_url": "https://api.github.com/users/gitbook-bot/starred{/owner}{/repo}",
            "subscriptions_url": "https://api.github.com/users/gitbook-bot/subscriptions",
            "organizations_url": "https://api.github.com/users/gitbook-bot/orgs",
            "repos_url": "https://api.github.com/users/gitbook-bot/repos",
            "events_url": "https://api.github.com/users/gitbook-bot/events{/privacy}",
            "received_events_url": "https://api.github.com/users/gitbook-bot/received_events",
            "type": "User",
            "site_admin": false
        },
        "parents": [
            {
                "sha": "eb2e1a8288f84dd5e253129cb7e080f7c08cfd82",
                "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/commits/eb2e1a8288f84dd5e253129cb7e080f7c08cfd82",
                "html_url": "https://github.com/Adobe-Marketing-Cloud/reactor-user-docs/commit/eb2e1a8288f84dd5e253129cb7e080f7c08cfd82"
            }
        ]
    },
    {
        "sha": "eb2e1a8288f84dd5e253129cb7e080f7c08cfd82",
        "node_id": "MDY6Q29tbWl0MTMxMDU3MTQ1OmViMmUxYTgyODhmODRkZDVlMjUzMTI5Y2I3ZTA4MGY3YzA4Y2ZkODI=",
        "commit": {
            "author": {
                "name": "gitbook-bot",
                "email": "ghost@gitbook.com",
                "date": "2018-04-25T20:02:56Z"
            },
            "committer": {
                "name": "gitbook-bot",
                "email": "ghost@gitbook.com",
                "date": "2018-04-25T20:02:56Z"
            },
            "message": "Initialize repository",
            "tree": {
                "sha": "f93e3a1a1525fb5b91020da86e44810c87a2d7bc",
                "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/git/trees/f93e3a1a1525fb5b91020da86e44810c87a2d7bc"
            },
            "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/git/commits/eb2e1a8288f84dd5e253129cb7e080f7c08cfd82",
            "comment_count": 0,
            "verification": {
                "verified": false,
                "reason": "unsigned",
                "signature": null,
                "payload": null
            }
        },
        "url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/commits/eb2e1a8288f84dd5e253129cb7e080f7c08cfd82",
        "html_url": "https://github.com/Adobe-Marketing-Cloud/reactor-user-docs/commit/eb2e1a8288f84dd5e253129cb7e080f7c08cfd82",
        "comments_url": "https://api.github.com/repos/Adobe-Marketing-Cloud/reactor-user-docs/commits/eb2e1a8288f84dd5e253129cb7e080f7c08cfd82/comments",
        "author": {
            "login": "gitbook-bot",
            "id": 31919211,
            "node_id": "MDQ6VXNlcjMxOTE5MjEx",
            "avatar_url": "https://avatars2.githubusercontent.com/u/31919211?v=4",
            "gravatar_id": "",
            "url": "https://api.github.com/users/gitbook-bot",
            "html_url": "https://github.com/gitbook-bot",
            "followers_url": "https://api.github.com/users/gitbook-bot/followers",
            "following_url": "https://api.github.com/users/gitbook-bot/following{/other_user}",
            "gists_url": "https://api.github.com/users/gitbook-bot/gists{/gist_id}",
            "starred_url": "https://api.github.com/users/gitbook-bot/starred{/owner}{/repo}",
            "subscriptions_url": "https://api.github.com/users/gitbook-bot/subscriptions",
            "organizations_url": "https://api.github.com/users/gitbook-bot/orgs",
            "repos_url": "https://api.github.com/users/gitbook-bot/repos",
            "events_url": "https://api.github.com/users/gitbook-bot/events{/privacy}",
            "received_events_url": "https://api.github.com/users/gitbook-bot/received_events",
            "type": "User",
            "site_admin": false
        },
        "committer": {
            "login": "gitbook-bot",
            "id": 31919211,
            "node_id": "MDQ6VXNlcjMxOTE5MjEx",
            "avatar_url": "https://avatars2.githubusercontent.com/u/31919211?v=4",
            "gravatar_id": "",
            "url": "https://api.github.com/users/gitbook-bot",
            "html_url": "https://github.com/gitbook-bot",
            "followers_url": "https://api.github.com/users/gitbook-bot/followers",
            "following_url": "https://api.github.com/users/gitbook-bot/following{/other_user}",
            "gists_url": "https://api.github.com/users/gitbook-bot/gists{/gist_id}",
            "starred_url": "https://api.github.com/users/gitbook-bot/starred{/owner}{/repo}",
            "subscriptions_url": "https://api.github.com/users/gitbook-bot/subscriptions",
            "organizations_url": "https://api.github.com/users/gitbook-bot/orgs",
            "repos_url": "https://api.github.com/users/gitbook-bot/repos",
            "events_url": "https://api.github.com/users/gitbook-bot/events{/privacy}",
            "received_events_url": "https://api.github.com/users/gitbook-bot/received_events",
            "type": "User",
            "site_admin": false
        },
        "parents": [

        ]
    }
]
