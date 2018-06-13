Petri Dish
==========

This serves as simulator for the primordial soup setup. Instead of distributing content to different repositories, they are kept here in different directories.

This is an early POC to see how local development could work w/o running a runtime container.

![Demo](docs/demo.gif)

Quick Start
-----------

```
# npm doesn't want to recursively install file:// dependencies 
$ cd ../htlengine && npm install
$ cd ../md2json && npm install
$ cd ../petridish && npm install
$ npm start
```

Open http://localhost:3000/demo/index.md

### Using the local git server

1. Same as above but also start a local git server based on local content. See instructions in [git-server](../../research/git/git-server)
2. open: http://localhost:3000/localgit/index.md

How it works
------------

The test repositories are located int the  `dishes` directory:

```
dishes/
├── github_soupdemo_code/
│   └── master/
│       └── homepage.htl
└── github_soupdemo_content/
    └── master/
        └── index.md
```

For now, this is just normal content of _this_ repository, but could be cloned or submoduled here.

In the `config.js` we define the strain configurations and the location of the code and content repositories.
For local development, one can choose either a (local) git server URL or a filesystem path that points to a directory.

```js
// config.js
const baseDir = path.join(__dirname, 'dishes');

module.exports = {
    strains: {
        'demo': {
            // example of using the local filesystem as source
            code: path.join(baseDir, 'github_soupdemo_code/master'),
            content: path.join(baseDir, 'github_soupdemo_content/master'),
            cache: path.join(baseDir, 'tmp', 'demo')
        },

        'localgit': {
            // example of using a local git server as source
            code: 'http://localhost:5000/raw/helix/helix-demo-code/master',
            content: 'http://localhost:5000/raw/helix/helix-demo-content/master',
            cache: path.join(baseDir, 'tmp', 'localgit')
        }
    }
};
```

The `sever.js` provides a simple _express_ server that resolves the path to the respective _strain_, which is a 
code + content configuration. Please note that the exact definition and usage of _strains_ need to be 
elaborated. 

The url has the format: `/<strain>/<resource>` and is then resolved to the respective markdown file
located in the `content` dish. 

The markdown file is converted to JSON using the (usual) [md2json](../md2json) converter. The resulting JSON also contains
the name of the template, extracted from the _frontmatter_. This is then resolved to a `.htl` template inside
the `code` dish.

The `.htl` script is compiled into JavaScript using the [htlengine](../htlengine) and finally executed, using the 
resource JSON that was previously extracted from the markdown.

  
