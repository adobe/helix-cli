# Troubleshooting Helix

## During (Local Development)

### Increase the Log Level

Start `hlx up --log-level debug` to increase the log level. Other possible values are `verbose` and `silly`. With `hlx up --log-file mylog.log` you can set the file location for the log file.

### Check the Payload in the Browser

While running `hlx up`, you can add `?debug=true` to any URL to see the current content of the `context` pipeline payload in your browser's dev tools. It is useful when writing HTL to remember the exact object structure of all properties that are available in the `context`.

### Check in Pipeline Payload

Every time you make a request to Helix running in development mode (i.e. when using `hlx up`) or running a unit test, the contents of the pipeline will be dumped into the directory `logs/debug/*`. Each request creates one subdirectory and each subdirectory contains one JSON file for each step of the pipeline.

This gives you a very fine-grained insight into the pipeline.

### Use the Debugger

You can debug your HTL scripts and your `pre.js` using the built-in node.js debugger. Whenever `hlx up` is run, the debugger is launched, and you can attach your debugger, e.g. [Visual Studio Code](https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_attaching-to-nodejs)

## In Production

### Use the `X-Debug` Header

Helix strips out most unneccessary response headers in the CDN. You can enable debug headers by making a request that includes the `X-Debug` request header with any value. 

```bash
$ curl -I -H "X-Debug: true" https://www.project-helix.io/index.html
HTTP/2 200
access-control-allow-headers: *
access-control-allow-methods: OPTIONS, GET, DELETE, POST, PUT, HEAD, PATCH
access-control-allow-origin: *
content-type: text/html; charset=UTF-8
perf-br-resp-out: 1542878687.219
server: api-gateway/1.9.3.1
x-content-type-options: nosniff
x-frame-options: deny
x-gw-cache: MISS
x-openwhisk-activation-id: 2c642c9aca404baba42c9aca40fbab24
x-request-id: Sqe1MRYwgeirtA5l1YxWy5LPd6WHujZo
x-xss-protection: 1; mode=block
x-backend-name: 3t7g8apsfQlFyvuHIQn9e8--F_AdobeRuntime
x-cdn-request-id: 3f6e5147-1e8d-4102-8a39-173f3c6c0af2
cache-control: max-age=604800, public
date: Thu, 22 Nov 2018 09:25:21 GMT
via: 1.1 varnish
age: 34
x-served-by: cache-lhr6320-LHR
x-cache: HIT
x-cache-hits: 1
x-timer: S1542878721.015028,VS0,VE4
vary: X-Debug, X-Strain
strict-transport-security: max-age=31536000; includeSubDomains
x-version: 100; src=100; cli=0.9.2-pre.4; rev=c25e2133d8bce6c5812a774fa272ad73a8d33458
x-backend-url: /api/v1/web/helix/default/git-github-com-adobe-project-helix-io-git--master--html?owner=adobe&repo=project-helix.io&ref=master&path=/index.md&selector=&extension=html&branch=master&strain=default&params=(null)
x-branch: master
x-strain: default
x-github-static-ref: @(null)
x-action-root: /helix/default/git-github-com-adobe-project-helix-io-git--master--
x-url: /index.html
x-root-path:
set-cookie: X-Strain=default; Secure; HttpOnly; SameSite=Strict;
```

### Disable the Static Fallback

The default processing path is to first make a request to the pipeline action, and if that produces an error 404, to fall back to the static action.
This can lead to the static action obscuring error messages (and headers) coming from the pipeline action or the OpenWhisk Runtime.

In order to disable this fallback, add the request header `X-Disable-Static: true`.

### Force-load a Strain

In order to override the strain selection that happens in the CDN, make a request with the `X-Strain` request header. 

### Call OpenWhisk via HTTP

You can make requests directly to OpenWhisk to see the raw response. The `x-backend-url` header from above gives you an indication of the URL to use:

```bash
$ curl "https://adobeioruntime.net/api/v1/web/helix/default/git-github-com-adobe-project-helix-io-git--master--html?owner=adobe&repo=project-helix.io&ref=master&path=/index.md&selector=&extension=html&branch=master&strain=default&params=(null)"
```

### Call OpenWhisk using the OpenWhisk Developer Tools

If you have the `wsk` OpenWhisk Command Line installed, you can also make requests to OpenWhisk using `wsk` to see the raw (JSON) response:

```bash
$ wsk action invoke git-github-com-adobe-project-helix-io-git--master--html --blocking --result -p owner adobe -p repo project-helix.io -p ref master -p path index.md -p extension html -p branch master -p strain default
```

### Check OpenWhisk Logs

Use `wsk activation poll` or `wsk activation logs 2c642c9aca404baba42c9aca40fbab24` to see all OpenWhisk logs or the logs for a particular activation. The `x-openwhisk-activation-id` header from above gives you the activation ID.
