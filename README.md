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
  --tls-key, --tlsKey      Path to .key file (for enabling TLS)        [string]
  --tls-cert, --tlsCert    Path to .pem file (for enabling TLS)        [string]
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

### setting up a self-signed cert for using https

1. create the certificate


```
$ openssl req -new -newkey rsa:4096 -x509 -sha256 -days 365 -nodes -out server.crt -keyout server.key -subj "/CN=localhost"
```

this will create 2 files: `server.crt` and `server.key`

2. start hlx with tls support

```
$ hlx up --tls-cert server.crt --tls-key server.key
    ____              __    ___   v14.21.4
   / __/______ ____  / /__ / (_)__
  / _// __/ _ `/ _ \/  '_// / / _ \
 /_/ /_/  \_,_/_//_/_/\_\/_/_/_//_/

info: Starting Franklin dev server v14.21.4
info: Local Franklin dev server up and running: https://localhost:3000/
```

3. (optional) Add arguments to .env file:

```
$ echo -e "HLX_TLS_CERT=server.crt\nHLX_TLS_KEY=server.key" >> .env
```

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

#### Global

| option | variable | default | description |
|--------|----------|---------|-------------|
| `--log-file` | `HLX_LOG_FILE` | `-` | Log file. use `-` to log to stdout |
| `--log-level` | `HLX_LOG_LEVEL` | `info` | Log level |

#### Up command

| option            | variable            | default     | description                                                 |
|-------------------|---------------------|-------------|-------------------------------------------------------------|
| `--port`          | `HLX_PORT`          | `3000`      | Development server port                                     |
| `--addr`          | `HLX_ADDR`          | `127.0.0.1` | Development server bind address                             |
| `--livereload`    | `HLX_LIVERELOAD`    | `true`      | Enable automatic reloading of modified sources in browser.  |
| `--no-livereload` | `HLX_NO_LIVERELOAD` | `false`     | Disable live-reload.                                        |
| `--open`          | `HLX_OPEN`          | `/`         | Open a browser window at specified path after server start. |
| `--no-open`       | `HLX_NO_OPEN`       | `false`     | Disable automatic opening of browser window.                |
| `--tls-key`       | `HLX_TLS_KEY`       | undefined   | Path to .key file (for enabling TLS)                        |
| `--tls-cert`      | `HLX_TLS_CERT`      | undefined   | Path to .pem file (for enabling TLS)                        |

# Developing Helix CLI

## Testing

You can use `npm run check` to run the tests and check whether your code adheres
to the helix-cli coding style.
