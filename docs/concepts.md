Concepts
========

Overview of request processing
------------------------------

An HTTP request is received on the edge server (fastly) and is associated to a [service configuration][fastly-services].
The configuration contains a varnish cache script ([VCL][vcl]) that extracts processing information from
the request. Those are:

- requested resource
- selector
- [extension][extension]
- [strain][strain] name

Based on this it looks up:

- backend type and url
- content repository
- adobeioruntime action or static server url

For dynamic requests, it invokes the adobeioruntime action, passing along content repository
and resource information. Once it retrieves the response it will cache and deliver it back to the
client.

Requests to static resources are proxied through a single global `helix-services/static@v1`
action that handles requests to all static resources.


Resource processing scripts
---------------------------

Typically every **resource type + selector** tuple is handled by 1 pipeline script. Every pipeline
script is deployed as 1 adobeioruntime action. The pipeline scripts are in essence an openwhisk wrapper
around the [helix pipeline](https://github.com/adobe/helix-pipeline).

In order to allow for individual versions (strains) of the same pipeline script, the actions are
name coded with the SHA of the commit during deploy time and the script name. It takes the format:

```
/<sha>/<type>

```

For example:

```
/f436464e87ee5c09058ea57cf5c0bc4fe3a30b33/html
```


Compiling the sources (building)
--------------------------------

Since it would be cumbersome to write full fledged openwhisk action scripts for the entire resource
processing, helix uses the [helix pipeline](https://github.com/adobe/helix-pipeline) that
does most of the job. The developer usually only needs to provide a script that transforms the
generated virtual dom of the resource into the respective media type.

The default pipeline provides a way to specify a `once` function for this purpose, which are normal
pipeline scripts `Context function(Context ctx, Action act)` that operate on the `context`.
See [Anatomy of a Pipeline](https://github.com/adobe/helix-pipeline/blob/master/README.md) for more details.

To make things even easier for developers, helix supports [htl](https://github.com/adobe/htl-spec) templates
and turns them into pipeline scripts during build time.

The build process uses [parcel](https://github.com/parcel-bundler/parcel) to process the templates.
The compiled template is turned into a pipeline script and then wrapped with a bit of code to turn 
the pipeline into an openwhisk action. It also ensures that a corresponding `pre.js` is executed 
before the `once` script.

Scripts can also be provided directly as pipeline scripts (i.e. using kind of a null-template).

For example:

```
src
├── html.htl
├── html.pre.js
└── nav_json.js
```

Would be compiled to:

```
.hlx/build
├── html.js              // pipeline script (once)
├── html.pre.js          // pre script required by html.js
├── html.info.json       // script information for deployment
├── nav_json.js          // pipeline script
└── nav_json.info.json   // script info
```

The `*.info.json` file contains information needed during deployment, for example:

```
{
  main: "html.js",
  requires: [
    "html.pre.js"
  ]
}
```

> **Note**: Helix no longer creates a _bundle_ or _webpack_ of the scripts, but deploys the action
            as archive. This simplifies the dependency processing.


Building the Action
-------------------

The openwhisk actions needed for deployment are built during the `hlx deploy` step. For that, the
`*.info.json` files generated during build time are use to package the correct scripts into the
archive. essentially, every `*.info.json` results in 1 openwhisk action.

During the deploy step, the javascript files for the action are analyzed to extract all external
modules needed that are not provided by the openwhisk container.

Finally, the action archive is created by including all external modules and the generated script
files.

Definitions
-----------

### Strain

A _strain_ is the part of a Helix configuration that maps HTTP requests to a combination
of GitHub repositories for code, content and static files. In the simplest case,
a single repository can be used for all three. A Helix configuration consists of
one or more strains. This results in the deployment of matching OpenWhisk actions
to Adobe I/O Runtime and configures Fastly which actions to invoke in response
to HTTP requests.

### Resource

The _resource_ is the target of the HTTP request. It typically maps to a markdown 
document in the content repository, without the [file extension][extension].

### Selector

A _selector_ is the URL part between the [resource][resource] and the
[file extension][extension], e.g. `bar` in `/foo.bar.html`. You can use
selectors to have the [Helix pipeline][pipeline] render different variations 
of the same underlying resource, e.g. you may choose to have an `/index.html` 
(default/empty selector), and `/index.toc.json` for a table of contents of the 
same content but in JSON format, or an `/index.sitemap.xml` for a sitemap in XML 
format. 

### File Extension

[Helix pipelines][pipeline] key on the _file extension_ of the requested
resource, e.g. `html` in `/foo.bar.html`.


[fastly-services]: https://docs.fastly.com/guides/basic-setup/working-with-services
[vcl]: https://docs.fastly.com/vcl/
[strain]: #strain
[selector]: #selector
[resource]: #resource
[extension]: #file-extension
[pipeline]: https://github.com/adobe/helix-pipeline/blob/master/README.md
