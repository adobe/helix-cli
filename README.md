# Helix Command Line Interface (`hlx`)

## Status

[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-cli.svg)](https://codecov.io/gh/adobe/helix-cli)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-cli/master.svg)](https://circleci.com/gh/adobe/helix-cli/tree/master)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-cli.svg)](https://github.com/adobe/helix-cli/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-cli.svg)](https://github.com/adobe/helix-cli/issues)
[![Greenkeeper badge](https://badges.greenkeeper.io/adobe/helix-cli.svg)](https://greenkeeper.io/)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-cli.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-cli)

The Helix Command Line Interface allows web developers to create, develop, and deploy digital experiences using Project Helix

## Installation

Install `hlx` as a global command. You need Node 10.0 or newer.

```bash
$ npm install -g @adobe/helix-cli
```

## Quick Start

```
$ hlx --help
hlx <command>

Commands:
  hlx demo <name> [dir]  Create example helix project.
  hlx up [files...]      Run a Helix development server
  hlx build [files..]    Compile the template functions and build package
  hlx package            Create Adobe I/O runtime packages
  hlx deploy             Deploy packaged functions to Adobe I/O runtime
  hlx perf               Test performance
  hlx publish            Activate strains in the Fastly CDN and publish the site
  hlx clean              Remove generated files and caches.
  hlx completion         generate bash completion script

Options:
  --version    Show version number                                     [boolean]
  --log-file   Log file (use "-" for stdout)              [array] [default: "-"]
  --log-level  Log level
        [string] [choices: "silly", "debug", "verbose", "info", "warn", "error"]
                                                               [default: "info"]
  --help       Show help                                               [boolean]

for more information, find our manual at https://github.com/adobe/helix-cli
```

## Setting up a project

```
$ hlx demo <my-cool-project>
```

## Starting development

```
$ cd <my-cool-project>
$ hlx up
```

Just change contents in your project directory and reload `http://localhost:3000` to see the results.

## (Optional) Build artifacts

```
# In <my-cool-project>
$ hlx build
```

## (Optional) Deploy to Adobe I/O Runtime

### Automatic Deployment

By default, Helix will set up automated deployment that deploys whenever a new commit has been pushed to your GitHub code repository. In order to do so, you need a [CircleCI](https://circleci.com) account and generate a [personal API Token](https://circleci.com/account/api).

```
# In <my-cool-project>
$ hlx deploy \
  --circleci-auth <personal-api-token> \
  --wsk-namespace <your-namespace> \
  --wsk-auth <your-key> \
  --fastly-auth <key> \
  --fastly-namespace <serviceid>
```

As always, you can keep all parameters in `HLX_CIRCLECI_AUTH`, `HLX_WSK_AUTH`, and `HLX_FASTLY_AUTH` environment variables if you don't want them in your `.bash_history`.

### One-Shot Deployment

Alternatively, you can also perform a one-shot deployment like this:

```
# In <my-cool-project>
$ hlx deploy --wsk-namespace <your-namespace> --wsk-auth <your-key>
[==================================================] analyzing 0.0s
[==================================================] packaging 0.0s
✅  packaging completed  
[==================================================] deploying 0.0s
✅  deployment completed
```

Instead of passing `--wsk-auth` as a command line option, you can also set the `HLX_WSK_AUTH` environment variable.

## (Optional) Publish your Site

```
# In <my-cool-project>
$ hlx publish --fastly-auth <key> --fastly-namespace <serviceid>
Publishing [========================================----------]  4.1s
✅  All strains have been published and version 89 is now online.
```

### Purging the Cache upon Publishing

Whenever you run `hlx publish`, a new version of your site, with potentially changed code will be made available to visitors. For visitors to see the changes, the Fastly cache needs to be purged. By default, `hlx publish` uses a "Soft purge", which means that the entire content of your website will be marked as outdated (or stale), but not actually removed from the cache. When a request for a cached file that has been marked outdated hits Fastly, Fastly will serve the old version, but fetch a new version in the background. As a result, your site is still as fast as before, *but in order for changes to show up, two requests are needed*.

If you want to see your changes faster, at the expense of slower load times right after publishing, use the command `hlx publish --purge hard`, which triggers a hard purge, i.e. removes all cached objects from the Fastly CDN. Doing this on a site with substantial traffic is unwise, but it can be a useful option during development.

Finally, if you do not want the cache to be purged at all, run `hlx publish --purge skip`. Your changes will only become visible when the cached objects expire or the cache is cleared in some other way, for instance from the Fastly console or using an API call as part of a more complex continuous deployment set-up.

### Passing Request Parameters

Every request parameter is a potential cache-buster and given that modern web application practices liberally append request parameters for tracking purposes or to manage state for client-side applications, **Helix filters out all request parameters by default**.

This means, the client side of your application will still be able to access request parameters, but your server(less)-side scripts and templates will not see any parameters.

If you need to pass request parameters, you can whitelist the parameters you need using the `strain.params` configuration. The value of `params` is an array of whitelisted parameter names.

```yaml
strains:
  - name: default
    code: https://github.com/adobe/project-helix.io.git#master
    content: https://github.com/adobe/project-helix.io.git#master
    static: https://github.com/adobe/project-helix.io.git/htdocs#master
    params:
      - foo
      - bar
```

In the example above, the parameters `foo` and `bar` have been enabled. A request made to `https://www.example.com/index.html?foo=here&bar=there&baz=everywhere` will enable your application to read the `foo` and `bar` parameters. The `baz` parameter and all other parameters will be filtered out.

Every allowed parameter value will affect the caching of your site in the CDN.

#### Helix-Internal Request Parameters

All request parameters starting with `hlx_` will be passed through to the action, so that they can be used for Helix-internal purposes.

### Directory Index

The default behavior for directory indexes is to load `index.html` when requesting a path ending with `/`,
so that `/foo/bar/` becomes `/foo/bar/index.html`. This setting can be overwritten in `helix-config.yaml`
by adding an `index` property:

```yaml
strains:
  - name: default
    code: https://github.com/adobe/project-helix.io.git#master
    content: https://github.com/adobe/project-helix.io.git#master
    static: https://github.com/adobe/project-helix.io.git/htdocs#master
    directoryIndex: README.html
```

### Static Content Handling

Static content is delivered from the `htdocs` directory of the _code_ repository of the Helix project:

```yaml
strains:
  - name: default
    code: https://github.com/adobe/project-helix.io.git#master
    content: https://github.com/adobe/project-helix.io.git#master
    static: https://github.com/adobe/project-helix.io.git/htdocs#master
```

The same core configuration options (`repo`, `ref`, `root`, and `owner`) are supported for `static` as for `content`. 

After your next deployment with `hlx publish`, all static content will be served out of the 
directory `htdocs`. None of this will be visible in the URL, so that no visitor will ever see 
_htdocs_ in the URL. `https://example.com/favico.ico` would be served from `$REPO/htdocs/favico.ico`.

## Matching Strains to URLs

You can define a `url` for each `strain`. This property will make sure that only requests made
to this base URL will be mapped to the following URL, enabling patterns like having a production
instance on `www.*` and a development instance on `dev.*`.

An example configuration could look like this:

```yaml
strains:
  - name: default
    code: https://github.com/adobe/project-helix.io.git#master
    content: https://github.com/adobe/project-helix.io.git#master
    static: https://github.com/adobe/project-helix.io.git/htdocs#master
    url: https://www.primordialsoup.life

  - name: develop
    code: https://github.com/adobe/project-helix.io.git#dev
    content: https://github.com/adobe/project-helix.io.git#master
    static: https://github.com/adobe/project-helix.io.git/htdocs#master
    url: https://dev.primordialsoup.life/develop/
```

## Mixing old and new Content

Helix can run old and new versions of the same site side by side, and even intermixed. This allows you to gradually upgrade to using Helix. 

If you want to serve content from another origin server, just add the property `origin` to any strain. `code`, `content`, `directoryIndex`, and most other properties will then be ignored, as all content for that strain will be retrieved from the URL specified in `origin`.

You are still able to set strain `conditions` or assign traffic to a strain based on the `url` property. 

```yaml
strains:
  - name: default
    code: https://github.com/adobe/project-helix.io.git#master
    content: https://github.com/adobe/project-helix.io.git#master
    static: https://github.com/adobe/project-helix.io.git/htdocs#master

  - name: oldcontent
    origin: https://www.adobe.io
    url: https://www.primordialsoup.life/content/

  - name: proxy
    origin: https://www.adobe.io
    condition: req.http.host == "proxy.primordialsoup.life"
```

In the example above, there are three strains: `default` serves content from `www.primordialsoup.life` using Helix. But all URLs that start with `https://www.primordialsoup.life/content/` will be served from `www.adobe.io`. This means an image that is referenced as `/content/example.png` will be served from the Adobe I/O website.

Finally, on `proxy.primordialsoup.life`, all content of the old site is being served. This allows you to easily switch back to an old configuration.

## Development - Serving local content

Getting the Helix Development Server to use a local content repository can be done in 2 ways:

### Specify a local content url

This is the out-of-the box setup:

```yaml
definitions:
  defaults:
    - &localRepo "http://localhost/local/default.git"

strains:
  - name: default
    url: http://localhost:3000/
    code: *localRepo
    content: *localRepo
    static: *localRepo
```

The Helix Development server will automatically start a git server that can serve the content from
the local repository.

### Use the GitHub emulator

When starting the `hlx up` with `--local-repo` argument(s), it instructs the Helix Development Server to
start a git server that emulates GitHub repositories for a local git repository. All the strains that
have a _content_ or _static_ url that matches the `origin` of emulated repository are internally reconfigured
to use the local git server instead.

`--local-repo .` is the implicit default. For the simple case, where only one repository is used for code, content and static just do:

```
$ hlx up
```

which is equivalent to `hlx up --local-repo .`.

If you want to explicitly always fetch from GitHub, i.e. ignore the local checkout in the current working directory (or any other checkout specified with `--local-repo`), use `--no-local-repo`:

```
$ hlx up --no-local-repo
```

#### Multi Strain Example

In the following config, we define 2 repositories:

- `defaultRepo` contains the project's code and the main content
- `apiRepo` contains additional content; for example the API documentation.

We also define 2 strains, one for each purpose.

```yaml
definitions:
  repos:
    - &defaultRepo https://github.com/helix/welcome.git#master
    - &apiRepo https://github.com/helix/welcome-api.git#master

strains:
  - name: api
    url: https://www.project-helix.io/api
    code: *defaultRepo
    content: *apiRepo
    static: *apiRepo

  - name: default
    url: https://www.project-helix.io/
    code: *defaultRepo
    content: *defaultRepo
    static: *defaultRepo
```

Usually, when invoking `hlx up` without any arguments, the Helix Development Server will serve the
content directly from GitHub. This is not suitable for local development. Also, the `api` strain
will never be selected, because the `localhost:3000` host header will not match the specified `url` 
condition.

Starting the server with:  

```
$ hlx up --host=www.project-helix.io
```

Solves the latter problem. the `--host` argument internally overrides the `request.header`, so that
the strain resolution works as desired.

Assume that we also have a local checkout of the `welcome-api`, beside the `welcome` repository:

```
projects/
├── welcome/
│   ├── helix-config.yaml
│   └── index.md
└── welcome-api/
    └── index.md
```

We can now launch the server with the respective `--local-repo` arguments: 

```
$ hlx up --host=www.project-helix.io --local-repo=. --local-repo=../welcome-api
```

Now the server will transiently reconfigure the strains, so that the emulated repositories are used.

> **Note**: If you turn on `--log-level=debug` you should see log entries for the emulated repositories:   
```
[hlx] debug: git emulating https://github.com/helix/welcome.git via http://127.0.0.1:52270/helix/github.com--helix--welcome.git#master from './'
[hlx] debug: git emulating https://github.com/helix/welcome-api.git via http://127.0.0.1:52270/helix/github.com--helix-welcome-api.git#master from '../welcome-api'
```

For convenience, you can also specify the arguments in an `.env` file:

```dotenv
HLX_HOST=www.project-helix.io
HLX_LOCAL_REPO=., ../welcome-api
HLX_LOG_LEVEL=debug
```


## (Recommended) Performance Testing

You can (and should) test the performance of your deployed site by running `hlx perf`.

The default test will test the entry page of every strain (using the `url`) property, if defined. Additional known URLs can be configured for each strain using the key `urls` (expects an array of URLs).

The default test will run from a mid-range mobile phone (Motorola Moto G4), using a regular 3G connection from London, UK. It makes sure that the Lighthouse Accessibility Score and the Lighthouse Performance Score of your site is at least 80.

You can set custom performance budgets and change the performance condition for each strain using the `perf` property. If a strain has no `perf` measurement configured, the `perf` configuration of the default strain will be used.

An example performance configuration might look like this:

```yaml
strains:
  - name: default
    code: https://github.com/adobe/project-helix.io.git#master
    content: https://github.com/adobe/project-helix.io.git#master
    static: https://github.com/adobe/project-helix.io.git/htdocs#master
    url: https://www.primordialsoup.life
    urls:
      - https://www.primordialsoup.life/README.html
    perf:
      device: iPhone8
      connection: good3G
      location: Sydney
      visually_complete_85: 1500
      lighthouse-best-practices-score: 80
```

If the site does not meet all performance criteria you have defined, `hlx perf` will exit with a non-null exit code (the exit code equals the number of failed tests). This allows you to use `hlx perf` as a gating condition in a CI/CD workflow.

### Testing Environment

* Possible `device` values are:
  * `MotorolaMotoG4`
  * `iPhone5`
  * `iPhone6`
  * `iPhone6Plus`
  * `iPhone7`
  * `iPhone8`
  * `Nexus5X`
  * `Nexus6P`
  * `GalaxyS5`
  * `iPad`
  * `iPadPro`
* Possible `connection` values are: 
  * `regular2G`
  * `good2G`
  * `slow3G`
  * `regular3G`
  * `good3G`
  * `emergingMarkets`
  * `regular4G`
  * `LTE`
  * `dsl`
  * `wifi`
  * `cable`
* Possible `location` values are:
  * `NorthVirginia`
  * `Frankfurt`
  * `Sydney`
  * `Ohio`
  * `California`
  * `Oregon`
  * `Canada`
  * `Ireland`
  * `Tokyo`
  * `Seoul`
  * `Singapore`
  * `Mumbai`
  * `SaoPaulo`
  * `London`

### Performance Metrics

You can set performance budgets against following scores (more is better) and metrics (less is better):

* `speed_index`: Speed Index
* `visually_complete`: Visually Complete
* `visually_complete_85`: 85% Visually Complete
* `lighthouse-seo-score`: Lighthouse SEO Score
* `lighthouse-best-practices-score`: Lighthouse Best Practices Score
* `lighthouse-accessibility-score`: Lighthouse Accessibility Score
* `lighthouse-performance-score`: Lighthouse Performance Score
* `lighthouse-pwa-score`: Lighthouse Progressive Web App Score
* `js-parse-compile`: JS Parse & Compile
* `time-to-first-byte`: Time to First Byte
* `first-contentful-paint`: First Contentful Paint
* `first-meaningful-paint`: First Meaningful Paint
* `firstRender`: First Paint
* `dom-size`: DOM Element Count
* `estimated-input-latency`: Estimated input latency
* `consistently-interactive`: Time to Interactive
* `first-interactive`: First CPU Idle
* `html_body_size_in_bytes`: Total HTML size in bytes
* `html_size_in_bytes`: Total HTML transferred
* `page_wait_timing`: Response time
* `page_size_in_bytes`: Total Page transferred
* `page_body_size_in_bytes`: Total Page size in bytes
* `asset_count`: Number of requests
* `onload`: onLoad
* `oncontentload`: onContentLoad

#### Structured (JUnit) Performance Reporting

By calling `hlx perf` with the option `--junit <file>`, the performance test 
results will be reported in JUnit-format, which makes it possible to integrate
performance result reporting with the CI system performing an automated deployment.

For `hlx demo full`, a full CI configuration is created that will run a performance
test after a completed deployment, report the per-metric results and mark the build
as failed in case metrics are not met.

## Supported Programming Languages

Helix allows you to develop experiences using a number of languages in different contexts. The most important languages are:

* HTL
* JavaScript
* JSX

Please note that these languages are all executed server-side (or serverless-side, as the code is on Adobe I/O Runtime). In some cases this means that you can move code between client and server with moderate changes.

### Creating Things in Helix with HTL

HTL stands for [HTML Template Language and was originally introduced for Adobe Experience Manager](https://docs.adobe.com/content/help/en/experience-manager-htl/using/getting-started/update.html). The implementation in Helix is based on the [HTL Specification](https://github.com/adobe/htl-spec/blob/master/SPECIFICATION.md), but as Helix and the underlying [`htlengine`](https://github.com/adobe/htlengine) are written in JavaScript rather than Java, and as the object model between Helix and AEM is different (check out the [`helix-pipeline` documentation](https://github.com/adobe/helix-pipeline/tree/master/docs) for Helix' domain model), your templates translate roughly rather than directly.

You can use HTL within Helix in exactly one context: to create rendering templates for pages or page fragments. Your HTL templates will be compiled by Helix into a JavaScript function, which you can then invoke on Adobe I/O Runtime (through Fastly) or locally (through the Helix Simulator). Rendering templates operate on the current [`context`](https://github.com/adobe/helix-pipeline/blob/master/docs/context.schema.md) and return a HTML string that will be delivered to the browser.

HTL templates follow the naming pattern `src/${extension}.htl` or `src/${selector}_${extension}.htl`, for instance `src/html.htl` or `src/footer_html.htl`.

Because HTL is a pure declarative templating language, you cannot make any modifications within HTL to change the context. To do that, you need to use JavaScript, which is explained in the next section.

### Creating Things in Helix with JavaScript

JavaScript is the universal language that powers Helix and you can use it in a wide array of settings in Helix:

1. to create HTML, JSON, Text, XML, or other documents to be served to the browser (as a template function)
2. to modify and manipulate the [`context`](https://github.com/adobe/helix-pipeline/blob/master/docs/context.schema.md) before it is handed off to a template function (as `pre.js`)
3. to handle requests for forms, web applications, and to create small APIs (as `cgi-bin`)
4. to provide helper functions that can be used elsewhere in Helix (as modules)

#### JavaScript Template Functions

A JavaScript template functions is a step in the Helix rendering Pipeline that takes the current [`context`](https://github.com/adobe/helix-pipeline/blob/master/docs/context.schema.md) and sets the `context`'s [`response.body`](https://github.com/adobe/helix-pipeline/blob/master/docs/response.schema.md#body). It is a full-powered (serverless) JavaScript function, so you can do whatever you want, include any NPM module that's useful, as long as the function is fast enough to be executed within a couple of seconds.

JavaScript template functions are found in files that are follow the naming pattern `src/${extension}.js` or `src/${selector}_${extension}.js`, for instance `src/html.js` or `src/footer_html.js`. Only a number of `extension`s are allowed, including `html`, `json`, `txt`, `xml`, `svg`, and `css`. 

A minimal functional JavaScript template function must export a `main` function and should set the `context`'s [`response.body`](https://github.com/adobe/helix-pipeline/blob/master/docs/response.schema.md#body) property.

```javascript
// exporting `main` is mandatory
module.exports.main = (context, action) {
  context.response = {
    // setting the body is the purpose of the function
    body: 'Hello World'
  };
}
```

#### JavaScript `pre.js`

A JavaScript `pre.js` ("pree-jay-ess") is a collection of JavaScript functions that will be executed by the Helix Pipeline right before the template function gets called. This allows a `pre.js` to prepare the context in a way that makes it easier to use in a template function.

In addition, a `pre.js` can use [additional extension points in the pipeline](https://github.com/adobe/helix-pipeline#extension-points), but the step running right before the template function is the most common extension point that gave the `pre.js` its name.

`pre.js` files follow the naming pattern `src/${extension}.pre.js` or `src/${selector}_${extension}.pre.js`, for instance `src/html.pre.js` or `src/footer_html.pre.js`. They are the companions of the template functions (in HTL, JavaScript or JSX with the same selector and extension).

A minimal `pre.js` must exports a `pre` function and has access to the [`context`](https://github.com/adobe/helix-pipeline/blob/master/docs/context.schema.md) and [`action`](https://github.com/adobe/helix-pipeline/blob/master/docs/action.schema.md) of the pipeline.

```javascript
module.exports.pre = (context, action) => {
  console.log('I am here. You can see this log message in the Adobe I/O Runtime console.');
}
```

#### JavaScript `cgi-bin`

Template functions and `pre.js` have in common that they have no side effects, i.e. they cannot do anything other than change the `context` and render web experiences. This reflects the fact that they get used only to serve `GET` requests and are heavily cached, so that most visitors coming to your site won't actually run code in the Adobe I/O Runtime (which keeps your costs low), but this also means that you should not rely on them when you want actual work done, databases to be written, or emails to be sent.

For this, Helix provides you with a simple way of creating, deploying, and running serverless actions that **can** have side-effects. In [the spirit of 1997](https://medium.com/adobetech/2017-will-be-the-year-of-the-cgi-bin-err-serverless-f5d99671bc99), we call it the `cgi-bin`, and it is a place for scripts that are running on your behalf in Adobe I/O Runtime. They get deployed using `hlx deploy` with all your other code, they support multiple parallel deployments, CD, and all the best practices of 2019, but at the ease of development of 1997.

In order to create a `cgi-bin` script, all you need to do is to create a `.js` file in the `cgi-bin` directory, such as `hello.js`.

```javascript
module.exports.main = (params) => {
  var name = params.name || 'World';
  return {payload:  'Hello, ' + name + '!'};
}
```

This is the ["Hello World" example from Apache OpenWhisk](https://github.com/apache/incubator-openwhisk/blob/master/docs/samples.md#openwhisk-hello-world-example) and it can be used to create a very simple JSON API, which supports POST requests (with a multipart-formdata or JSON body) and GET requests (with URL parameters).

#### JavaScript Modules

In all the JavaScript examples above, you have full access to all NPM modules, all you have to do is to add a statement like:

```javascript
const request = require('request');
```

to your script. If there are additional helper functions you need in multiple parts of your project, you can simply put them into a JavaScript module below `src`. Make sure to `export` the functions and objects you want to consume in your `cgi-bin`, `pre.js`, or template functions.

### Creating Things in Helix with JSX

[JSX is an extension of the ES6 language](https://facebook.github.io/jsx/), originally created by Facebook for the client-side React framework, but, due to its practicality, adopted by [other frameworks](https://mithril.js.org/jsx.html) and is even used [on the server-side](https://nextjs.org).

JSX provides a shorthand syntax for creating DOM elements, which makes it well suited for creating templates using multiple components (really just functions) that are re-usable and re-mixable.

In Helix, JSX is used for serverless-side rendering of HTML pages or HTML page fragments, making it a language choice for Template Functions and an alternative for [JavaScript Template Functions](#javascript-template-functions).

The ability to mix imperative JavaScript code with HTML-generating functions that look almost like real HTML makes JSX an alternative to using HTL with `pre.js`, too, because you can just keep the pre-processing code inside your JSX file.

JSX files im Helix follow the naming pattern `src/${extension}.jsx` or `src/${selector}_${extension}.jsx`, for instance `src/html.jsx` or `src/footer_html.jsx`.

Like [JavaScript Template Functions](#javascript-template-functions), JSX operates on the `context`, produces `context.response.body` and needs a `main` entry point. A minimal JSX example would look like this:

```jsx
function MyComponent(context) {
  <div>Hello World</div>
}

module.exports.main = context => {
  context.response: {
    // the response body needs to be a string, so taking the `outerHTML` of
    // the topmost component is a good choice.
    body: MyComponent(context).outerHTML
  };
};
```

# Developing Helix CLI

## Testing

You can use `npm run check` to run the tests and check whether your code adheres
to the helix-cli coding style.
