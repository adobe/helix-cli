# Helix Command Line

`hlx` (short for Helix) is a command line for developing websites that use Project Helix.

## Installation

```bash
# npm link the various modules first
$ cd ../md2json && npm install && npm link
$ cd ../git-server && npm install && npm link
$ cd ../strainconfig && npm install && npm link
$ cd ../petridish && npm link @adobe/md2json && npm link @adobe/strainconfig && npm link @adobe/git-server && npm install && npm link
$ cd ../helix-cli && npm link @adobe/md2json && npm link @adobe/strainconfig && npm link @adobe/git-server && npm link @adobe/petridish && npm install
#
# make this local module available on the path:
$ cd ../helix-cli && npm link
$ hlx --help

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