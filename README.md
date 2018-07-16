# Helix Command Line Interface (`hlx`)

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-cli.svg)](https://codecov.io/gh/adobe/helix-cli)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-cli.svg)](https://circleci.com/gh/adobe/parcel-plugin-htl)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-cli.svg)](https://github.com/adobe/helix-cli/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-cli.svg)](https://github.com/adobe/helix-cli/issues)
[![Greenkeeper badge](https://badges.greenkeeper.io/adobe/helix-cli.svg)](https://greenkeeper.io/)

The Helix Command Line Interface allows web developers to create, develop, and deploy digital experiences using Project Helix

## Installation

Install `hlx` as a global command. You need Node 8 or newer.

```bash
$ npm install -g @adobe/helix-cli
```

## Example Projects

There is one example project in `/prototypes/petridish/examples/soupdemo`

```bash
$ cd ../petridish/examples/soupdemo
$ ./setup.sh
$ hlx up
```

And another one right here:

```bash
$ cd test/integration
$ git init &&  git add -A && git commit -m "inital commit"
$ hlx up
```

## Quick Start

```bash
$ hlx --help
hlx <cmd> [args]

Commands:
  hlx init <name> [dir]  Initialize the project structure           [aliases: i]
  hlx build              Compile the template functions and build package
                                                                    [aliases: b]
  hlx deploy             Deploy packaged functions to Adobe I/O runtime
                                                                    [aliases: d]
  hlx perf               Test performance                           [aliases: p]

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

## Setting up a project

```bash
$ hlx init <my-cool-project>
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
$ hlx hlx strain --fastly-auth <key> --fastly-namespace <serviceid>
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