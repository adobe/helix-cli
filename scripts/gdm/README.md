# GDM - Git Dependency Maker

Util that transforms the `@adobe` dependencies of an npm module into [github dependencies](https://docs.npmjs.com/files/package.json#git-urls-as-dependencies) and the `@adobe` dependencies of those dependencies into github dependencies too.
The branch defined for those `@adobe` github dependencies is `master`. This can be overruled via the GDM_MODULE_BRANCHES env variable:

```bash
env GDM_MODULE_BRANCHES='{"helix-simulator": "branchX", "hypermedia-pipeline": "branchY"}'
```

You can specify the module to be transformed location using the GDM_MODULE_PATH env variable. If not specified, the current folder is used.

The main goal is to transform the current module into a module that dependends only a `master` (or selected branches) version of its `@adobe` dependencies.

A typical use case is PR testing: get a `master` version `helix-cli` embedding only `master` versions of `@adobe` dependencies + a branch from one of those `@adobe` dependencies.

## Usage

```bash
env GDM_MODULE_BRANCHES='{hypermedia-pipeline": "branchY"}' GDM_MODULE_PATH='/Users/auser/workspace/helix-cli' node index.js
```
