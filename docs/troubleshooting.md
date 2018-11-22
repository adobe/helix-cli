# Troubleshooting Helix

## During (Local Development)

### Increase the Log Level

Start `hlx up --log-level debug` to increase the log level. Other possible values are `verbose` and `silly`. With `hlx up --log-file mylog.log` you can set the file location for the log file.

### Check the Payload in the Browser

While running `hlx up`, you can add `?debug=true` to any URL to see the current content of the `context` pipeline payload in your browser's dev tools. It is useful when writing HTL to remember the exact object structure of all properties that are available in the `context`.

### Check in Pipeline Payload

Every time you make a request to Helix running in development mode (i.e. when using `hlx up`) or running a unit test, the contents of the pipeline will be dumped into the directory `logs/debug/*`. Each request creates one subdirectory and each subdirectory contains one JSON file for each step of the pipeline.

This gives you a very fine-grained insight into the pipeline.

### Use the Debugger

You can debug your HTL scripts and your `pre.js` using the built-in node.js debugger. Whenever `hlx up` is run, the debugger is launched, and you can attach your debugger, e.g. [Visual Studio Code](https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_attaching-to-nodejs)

## In Production

### Use the `X-Debug` Header



### Force-load a Strain

### Check OpenWhisk Logs
