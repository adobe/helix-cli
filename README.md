Petri Dish
==========

his is an early POC to see how local development could work w/o running a runtime container.

Setup
-----------

```
# npm link the various modules first
$ cd ../openwhisk-loggly-wrapper && npm install
$ cd ../md2json && npm install && npm link
$ cd ../git-server && npm install && npm link
$ cd ../strainconfig && npm install && npm link
$ cd ../petridish && npm link @adobe/md2json && npm link @adobe/strainconfig && npm link @adobe/git-server && npm install

$ cd examples/soupdemo
$ ./setup.sh
$ npm install
$ npm run build
$ npm start

```

> **NOTE** THE REST OF THIS DOCUMENT WAS OUTDATED AND THE TEXT WAS REMOVED
>

