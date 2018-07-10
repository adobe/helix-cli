# Helix Command Line Interface (`hlx`)

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-cli.svg)](https://codecov.io/gh/adobe/helix-cli)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-cli.svg)](https://circleci.com/gh/adobe/parcel-plugin-htl)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-cli.svg)](https://github.com/adobe/helix-cli/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-cli.svg)](https://github.com/adobe/helix-cli/issues)
[![Greenkeeper badge](https://badges.greenkeeper.io/adobe/helix-cli.svg)](https://greenkeeper.io/)

The Helix Command Line Interface allows web developers to create, develop, and deploy digital experiences using Project Helix

## Installation

For now, manual installation only:

```bash
$ git clone git@github.com:adobe/helix-cli.git
$ npm install
$ npm link
```

In the future, this will become easier, boiling down to:

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
