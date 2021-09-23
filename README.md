# Helix Command Line Interface (`hlx`)

## Status

[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-cli.svg)](https://codecov.io/gh/adobe/helix-cli)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-cli/main.svg)](https://circleci.com/gh/adobe/helix-cli/tree/main)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-cli.svg)](https://github.com/adobe/helix-cli/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-cli.svg)](https://github.com/adobe/helix-cli/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-cli.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-cli)

The Helix Command Line Interface allows web developers to create, develop, and deploy digital experiences using Project Helix

## Installation

Install `hlx` as a global command. You need Node 12.11 or newer.

```bash
$ npm install -g @adobe/helix-cli
```

## Quick Start

```
$ hlx --help
Usage: hlx <command> [options]

Commands:
  hlx up  Run a Helix development server

Options:
  --version                Show version number                         [boolean]
  --log-file, --logFile    Log file (use "-" for stdout)  [array] [default: "-"]
  --log-level, --logLevel  Log level
        [string] [choices: "silly", "debug", "verbose", "info", "warn", "error"]
                                                               [default: "info"]
  --help                   Show help                                   [boolean]

use <command> --help to get command specific details.

for more information, find our manual at https://github.com/adobe/helix-cli
```

## Starting development

```
$ cd <my-cool-project>
$ hlx up
```

### automatically open the browser

The `--open` argument takes a path, eg `--open=/products/`, will cause the browser to be openend
at the specific location. Disable with `--no-open'.`

### environment

All the command arguments can also be specified via environment variables. the `.env` file is
loaded automatically.

example:

`.env`
```dotenv
HLX_OPEN=/products
HLX_PORT=8080
HLX_PAGES_URL=https://stage.myproject.com
```

# Developing Helix CLI

## Testing

You can use `npm run check` to run the tests and check whether your code adheres
to the helix-cli coding style.
