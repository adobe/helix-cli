# Helix Command Line Interface (`hlx`)

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-cli.svg)](https://codecov.io/gh/adobe/helix-cli)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-cli.svg)](https://circleci.com/gh/adobe/helix-cli)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-cli.svg)](https://github.com/adobe/helix-cli/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-cli.svg)](https://github.com/adobe/helix-cli/issues)
[![Greenkeeper badge](https://badges.greenkeeper.io/adobe/helix-cli.svg)](https://greenkeeper.io/)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-cli.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-cli)

The Helix Command Line Interface allows web developers to create, develop, and deploy digital experiences using Project Helix

## Installation

Install `hlx` as a global command. You need Node 8 or newer.

```bash
$ npm install -g @adobe/helix-cli
```

## Quick Start

```bash
$ hlx --help
hlx <command>

Commands:
  hlx demo <name> [dir]  Create example helix project.
  hlx up [files...]      Run a Helix development server
  hlx build [files..]    Compile the template functions and build package
  hlx deploy             Deploy packaged functions to Adobe I/O runtime
  hlx perf               Test performance
  hlx strain             Activate strains in the Fastly CDN

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]

for more information, find our manual at https://github.com/adobe/helix-cli
```

## Setting up a project

```bash
$ hlx demo <my-cool-project>
```

## Starting development

```bash
$ cd <my-cool-project>
$ hlx up
```

Just change contents in your project directory and reload `http://localhost:3000` to see the results.

## (Optional) Build artifacts

```bash
# In <my-cool-project>
$ hlx build
```

## (Optional) Test functions

```bash
# In <my-cool-project>
$ hlx test
```

## (Optional) Deploy to Adobe I/O Runtime

```bash
# In <my-cool-project>
$ hlx deploy --no-auto --wsk-namespace <your-namespace> --wsk-auth <your-key>
```

Instead of passing `--wsk-auth` as a command line option, you can also set the `HLX_WSK_AUTH` environment variable.

## (Optional) Publish your Site

```bash
# In <my-cool-project>
$ hlx strain --fastly-auth <key> --fastly-namespace <serviceid>
🐑 👾 🚀  hlx is publishing strains
🐑  Cloned latest version, version 356 is ready
🗝  Enabled Fastly to call secure OpenWhisk actions
🌲  Set content root for strain preview
👾  Set action root for strain  preview
👾  Set action root for strain  xdm
🏢  Set owner for strain        xdm
🌳  Set repo for strain         default
🌳  Set repo for strain         soupdemo
🌳  Set repo for strain         xdm
🏷  Set ref for strain          default
🏢  Set owner for strain        preview
👾  Set action root for strain  db5d4350c13924ad
🏷  Set ref for strain          db5d4350c13924ad
👾  Set action root for strain  soupdemo
👾  Set action root for strain  default
🏢  Set owner for strain        soupdemo
🏷  Set ref for strain          soupdemo
🏢  Set owner for strain        default
🏷  Set ref for strain          preview
🏢  Set owner for strain        db5d4350c13924ad
🏷  Set ref for strain          xdm
🌳  Set repo for strain         preview
🌳  Set repo for strain         db5d4350c13924ad
🌲  Set content root for strain default
✅  VCL strains.vcl has been updated
🌲  Set content root for strain soupdemo
🌲  Set content root for strain xdm
🌲  Set content root for strain db5d4350c13924ad
📕  All dicts have been updated.
🚀  Activated latest version, version 356 is live
💀  Purged entire cache
```

### Passing Request Parameters

Every request parameter is a potential cache-buster and given that modern web application practices liberally append request parameters for tracking purposes or to manage state for client-side applications, **Helix filters out all request parameters by default**.

This means, the client side of your application will still be able to access request parameters, but your server(less)-side scripts and templates will not see any parameters.

If you need to pass request parameters, you can whitelist the parameters you need using the `strain.params` configuration. The value of `params` is an array of whitelisted parameter names.

```yaml
- strain:
    name: default
    code: /hlx/default/git-github-com-adobe-helix-cli-git--dirty--
    params:
      - foo
      - bar
    content:
      repo: helix-cli
      ref: master
      owner: adobe
```

In the example above, the parameters `foo` and `bar` have been enabled. A request made to `https://www.example.com/index.html?foo=here&bar=there&baz=everywhere` will enable your application to read the `foo` and `bar` parameters. The `baz` parameter and all other parameters will be filtered out.

Every allowed parameter value will affect the caching of your site in the CDN.

### Directory Index

The default behavior for directory indexes is to load `index.html` when requesting a path ending with `/`,
so that `/foo/bar/` becomes `/foo/bar/index.html`. This setting can be overwritten in `.hlx/strains.yaml`
by adding an `index` property:

```yaml
- strain:
    name: default
    code: /hlx/default/git-github-com-adobe-helix-cli-git--dirty--
    index: README.html
    content:
      repo: helix-cli
      ref: master
      owner: adobe
```

### Static Content Handling

During `hlx build`, the static files are copied into `.hlx/dist`. The static files originate either
from a `src/**/static` directory, or are generated by the packager. The exact details are not defined
yet and might change in future versions. Example of static files are stylesheets, clientside javascripts,
 icons, web fonts, etc. 

The static content that is neither authored content nor code are made available through different 
methods to the CDN by distribution handlers. The distribution handler can be selected during deploy time
using the `--static-content` option. eg: `hlx deploy --static-content=github`. By default, all resources
below `/dist/` are treated as static content. 

#### none

`--static-content=none` : Disables any special static content handling.

#### bundled

`--static-content=bundled`: This is the (questionable) default. The static content files are
included into the package of the main (`html.zip`) action and subsequently served via openwhisk,
_abusing_ the main action as file server: 

```
$ hlx deploy --static-content=bundled
⏳  preparing package .hlx/build/git-github-com-adobe-hlxtest-git--master--html.zip:
    - package.json
    - main.js
    - server.js
    - dist/favicon.ico
    - dist/bootstrap.min.css
    - dist/style.css
    33037 total bytes
```

In contrast to the normal deployment of actions, the handler also includes the static
files, as well as a [`server.js`](src/openwhisk/server.js) which is used as entry function for the action. depending on the
requested path, either the static file is served, or the normal function is executed.

#### github

`--static-content=github`: The static content files are pushed to github. By default, they are committed
into an orphaned branch, `helix-static`, of the code repository. This is similar to github pages.

```
$ hlx deploy --static-content=github
git@github.com:adobe/hlxtest.git
⏳  preparing package .hlx/build/git-github-com-adobe-hlxtest-git--master--html.zip:
    - package.json
    - main.js
    3702 total bytes
⏳  Deploying git-github-com-adobe-hlxtest-git--master--html.zip as git-github-com-adobe-hlxtest-git--master--html
Initialized empty Git repository in .hlx/tmp/gh-static/git-github-com-adobe-hlxtest-git--master--/.git/
Switched to a new branch 'helix-static'
[helix-static (root-commit) 0bf3051] initializing static branch
To github.com:adobe/hlxtest.git
 * [new branch]      helix-static -> helix-static
Branch helix-static set up to track remote branch helix-static from origin.
A  bootstrap.min.css
A  favicon.ico
A  style.css
[helix-static cf5a206] updating static files.
 3 files changed, 10 insertions(+)
 create mode 100644 bootstrap.min.css
 create mode 100644 favicon.ico
 create mode 100644 style.css
To github.com:adobe/hlxtest.git
   0bf3051..cf5a206  helix-static -> helix-static
Branch helix-static set up to track remote branch helix-static from origin.
cf5a2060f6de5ad0b7cb24d964974c563f5e7708
Deployed static files to git@github.com:adobe/hlxtest.git/cf5a2060f6de5ad0b7cb24d964974c563f5e7708
```

After the files are pushed to github, the commit id is written to the strain config:

```yaml
- strain:
    name: ae9f783fcc2039fb
    code: /adobe/default/git-github-com-adobe-hlxtest-git--dirty--
    content:
      repo: hlxtest
      ref: master
      owner: adobe
    githubStatic:
      repo: hlxtest
      owner: adobe
      ref: cc4bb731a4e48b1690a37292e798781c67383f3e
```

Because the strain configuration is available to the CDN as edge directory, the edge server
can directly fetch the static files from github using the respective commit hash (`strain.githubStatic.ref`).

#### Azure Blob Storage

_TODO_: https://github.com/adobe/helix-cli/issues/60

#### S3

_TODO_: https://github.com/adobe/helix-cli/issues/54

#### Codeload

_TODO_: https://github.com/adobe/helix-cli/issues/57

## Matching Strains to URLs

You can define a `url` for each `strain`. This property will make sure that only requests made
to this base URL will be mapped to the following URL, enabling patterns like having a production
instance on `www.*` and a development instance on `dev.*`.

An example configuration could look like this:

```yaml
- strain:
    name: default
    code: /trieloff/default/https---github-com-adobe-helix-helpx-git--master--
    url: https://www.primordialsoup.life
    content:
      repo: reactor-user-docs
      ref: master
      owner: Adobe-Marketing-Cloud
      root: /
- strain:
    name: cd629c5a74d6d60f
    url: https://dev.primordialsoup.life/develop/
    code: /trieloff/default/https---github-com-adobe-helix-helpx-git--develop--
    content:
      repo: reactor-user-docs
      ref: master
      owner: Adobe-Marketing-Cloud
```

## (Recommended) Performance Testing

You can (and should) test the performance of your deployed site by running `hlx perf`.

The default test will test the entry page of every strain (using the `url`) property, if defined. Additional known URLs can be configured for each strain using the key `urls` (expects an array of URLs).

The default test will run from a mid-range mobile phone (Motorola Moto G4), using a regular 3G connection from London, UK. It makes sure that the Lighthouse Accessibility Score and the Lighthouse Performance Score of your site is at least 80.

You can set custom performance budgets and change the performance condition for each strain using the `perf` property. If a strain has no `perf` measurement configured, the `perf` configuration of the default strain will be used.

An example performance configuration might look like this:

```yaml
- strain:
    name: default
    code: /trieloff/default/https---github-com-adobe-helix-helpx-git--master--
    index: README.html
    static:
      deny:
        - "*.md"
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