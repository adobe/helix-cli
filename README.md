# AEM Command Line Interface (`aem`)

## Status

[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-cli.svg)](https://codecov.io/gh/adobe/helix-cli)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/adobe/helix-cli/main.yaml)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-cli.svg)](https://github.com/adobe/helix-cli/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-cli.svg)](https://github.com/adobe/helix-cli/issues)

The AEM Command Line Interface allows web developers to create, develop, and deploy digital experiences using the Adobe Experience Manager Sites feature Edge Delivery Services. Some of this functionality was known as Franklin or Project Helix before.

## Installation

Install `aem` as a global command. You need Node 12.11 or newer.

```bash
npm install -g @adobe/aem-cli
```

## Quick Start

```
$ aem --help
Usage: aem <command> [options]

Commands:
  aem up  Run a AEM development server

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
$ aem up
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

2. start aem with tls support

```
$ aem up --tls-cert server.crt --tls-key server.key
    ___    ________  ___                          __      __ v14.26.1
   /   |  / ____/  |/  /  _____(_)___ ___  __  __/ /___ _/ /_____  _____
  / /| | / __/ / /|_/ /  / ___/ / __ `__ \/ / / / / __ `/ __/ __ \/ ___/
 / ___ |/ /___/ /  / /  (__  ) / / / / / / /_/ / / /_/ / /_/ /_/ / /
/_/  |_/_____/_/  /_/  /____/_/_/ /_/ /_/\__,_/_/\__,_/\__/\____/_/

info: Starting AEM dev server v14.26.1
info: Local AEM dev server up and running: https://localhost:3000/
```

3. (optional) Add arguments to .env file:

```
$ echo -e "AEM_TLS_CERT=server.crt\nAEM_TLS_KEY=server.key" >> .env
```

### environment

All the command arguments can also be specified via environment variables. the `.env` file is
loaded automatically.

example:

`.env`
```dotenv
AEM_OPEN=/products
AEM_PORT=8080
AEM_PAGES_URL=https://stage.myproject.com
```

#### HTTP Proxy

In order to use a HTTP proxy (eg behind a corporate firewall), you can set the respective environment variables:

`NO_PROXY` is a list of host names (optionally with a port). If the input URL matches any of the entries in `NO_PROXY`, then the input URL should be fetched by a direct request (i.e. without a proxy).

Matching follows the following rules:

`NO_PROXY=*` disables all proxies.
Space and commas may be used to separate the entries in the `NO_PROXY` list.
If `NO_PROXY` does not contain any entries, then proxies are never disabled.
If a port is added after the host name, then the ports must match. If the URL does not have an explicit port name, the protocol's default port is used.
Generally, the proxy is only disabled if the host name is an exact match for an entry in the `NO_PROXY` list. The only exceptions are entries that start with a dot or with a wildcard; then the proxy is disabled if the host name ends with the entry.
See test.js for examples of what should match and what does not.

`*_PROXY`
The environment variable used for the proxy depends on the protocol of the URL. For example, https://example.com uses the "https" protocol, and therefore the proxy to be used is `HTTPS_PROXY` (NOT `HTTP_PROXY`, which is only used for http:-URLs).

If present, `ALL_PROXY` is used as fallback if there is no other match.

#### Global

| option | variable | default | description |
|--------|----------|---------|-------------|
| `--log-file` | `AEM_LOG_FILE` | `-` | Log file. use `-` to log to stdout |
| `--log-level` | `AEM_LOG_LEVEL` | `info` | Log level |

#### Up command

| option            | variable            | default     | description                                                 |
|-------------------|---------------------|-------------|-------------------------------------------------------------|
| `--port`          | `AEM_PORT`          | `3000`      | Development server port                                     |
| `--addr`          | `AEM_ADDR`          | `127.0.0.1` | Development server bind address                             |
| `--livereload`    | `AEM_LIVERELOAD`    | `true`      | Enable automatic reloading of modified sources in browser.  |
| `--no-livereload` | `AEM_NO_LIVERELOAD` | `false`     | Disable live-reload.                                        |
| `--open`          | `AEM_OPEN`          | `/`         | Open a browser window at specified path after server start. |
| `--no-open`       | `AEM_NO_OPEN`       | `false`     | Disable automatic opening of browser window.                |
| `--tls-key`       | `AEM_TLS_KEY`       | undefined   | Path to .key file (for enabling TLS)                        |
| `--tls-cert`      | `AEM_TLS_CERT`      | undefined   | Path to .pem file (for enabling TLS)                        |

# Developing AEM CLI

## Testing

You can use `npm run check` to run the tests and check whether your code adheres
to the aem-cli coding style.

# Troubleshooting

## `aem up` fails with `unable to get local issuer certificate`

This error occurs when the server certificate is not trusted by Node.js. The typical
cause is that connections to the server `*.aem.page` and `*.hlx.page` are intercepted
by an enterprise proxy or firewall which is trying to inspect the traffic.

These proxies use a private certificate authority (CA) to sign the certificates of the
servers they intercept. To make Node.js trust the server certificate, you need to add
the CA certificate to the list of trusted CAs.

The CA certificate is typically provided by your IT department. You can ask them for
the CA certificate and save it to a file, e.g. `my-ca.crt`.

Then you can use the [`NODE_EXTRA_CA_CERTS`](https://nodejs.org/docs/latest/api/cli.html) environment variable to make Node.js trust
the CA certificate:

```bash
export NODE_EXTRA_CA_CERTS=my-ca.crt
aem up
```

This will make Node.js trust the server certificate and `aem up` should work.