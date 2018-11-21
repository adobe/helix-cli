Concepts
========

Simplistic Overview of request processing
-----------------------------------------

A request is received on the edge server (fastly) and is associated to a service configuration.
The configuration contains a varnish cache script (VCL) that extracts processing information from
the request. those are:

- requested resource
- selector and extension
- strain name

based on this it looks up:

- backend type and url
- content repository
- adobeioruntime action or static server url

for dynamic requests, it invokes the adobeioruntime action, passing along content repository
and resource information. once it retrieves the response it will cache and deliver it back to the
client.


Resource processing scripts
---------------------------

Typically every **resource type + selector** tuple is handled by 1 pipeline script. With the current
architecture, every pipeline script is deployed as 1 adobeioruntime action. the pipeline scripts
are in essence a openwhisk wrapper around a [hypermedia pipeline](https://github.com/adobe/hypermedia-pipeline).

In order to allow for individual versions (strains) of the same pipeline script, the actions are
name coded with the code repository location, branch and script name. it usually takes the format:

```
<repository-url>--<branch>--[<selector>_]<type>

```
 
For example:

```
git-github-com-adobe-project-helix-io-git--master--html

```

> _todo: adjust after [#366](https://github.com/adobe/helix-cli/issues/366) is fixed._


As mentioned above, based on the information in the request, the edge will invoke the respective
script. for example a request for `www.project-helix.io/docs/index.nav.json` on the `develop` strain, 
might invoke `git-github-com-adobe-project-helix-io-git--dev--nav_json`.
  

Compiling the sources (building)
--------------------------------

Since it would be cumbersome to write full fledged openwhisk action scripts for the entire resource
processing, helix uses a [hypermedia pipeline](https://github.com/adobe/hypermedia-pipeline) that
does most of the job. The developer usually only needs to provide a script that transforms the
generated virtual dom of the resource into the respective media type.

The default pipeline provides a way to specify a `once` function for this purpose, which are normal
pipeline scripts `Context function(Context ctx, Action act)` that operate on the `context`.
See [Anatomy of a Pipeline](https://github.com/adobe/hypermedia-pipeline/blob/master/README.md) for more details.

To make things even easier for developers, helix supports [htl](https://github.com/adobe/htl-spec) templates
and turns them into pipeline scripts during build time.

The build process uses [parcel](https://github.com/parcel-bundler/parcel) to process the templates
using a [plugin](https://github.com/adobe/parcel-plugin-htl) mechanism. The compiled template
is turned into a pipeline script and then wrapped with a bit of code to turn the pipeline into an
openwhisk action. It also ensures that a corresponding `pre.js` is executed before the `once` script.

Scripts can also be provided directly as pipeline scripts (i.e. using kind of a null-template) 
(**Note**: this is currently not working: see [#334](https://github.com/adobe/helix-cli/issues/334)).

for example:

```
src
├── html.htl
├── html.pre.js
└── nav_json.js
```
 
would be compiled to:

```
.hlx/build
├── html.js              // pipeline script (once)
├── html.pre.js          // pre script required by html.js
├── html.info.json       // script information for deployment
├── nav_json.js          // pipeline script
└── nav_json.info.json   // script info
```

The script information json contains information needed during deployment. 

for example:

```
{
  main: "html.js",
  requires: [
    "html.pre.js"
  ]
}
```

> **Note**: Helix no longer creates a _bundle_ or _webpack_ of the scripts, but  deploys the action 
            as archive. this simplifies the dependency processing. 


Building the Action
-------------------

The openwhisk actions needed for deployment are built during the `hlx deploy` step. For that, the
`*.info.json` files generated during build time are use to package the correct scripts into the 
archive. essentially, every `*.info.json` results in 1 openwhisk action. 

During the deploy step, the javascript files for the action are analyzed to extract all external
modules needed that are not provided by the openwhisk container. 

Finally, the action archive is created by including all external modules and the generated script
files. 
