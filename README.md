Petri Dish
==========

This serves as simulator for the primordial soup setup. Instead of distributing content to different repositories, they are kept here in different directories.

This is an early POC to see how local development could work w/o running a runtime container.

Quick Start
-----------

```
# npm doesn't want to recursively install file:// dependencies 
$ cd ../htlengine && npm install
$ cd ../md2json && npm install
$ cd ../petridish && npm install
$ npm start
```

Open http://localhost:3000/demo/petri/master/index.html

![Demo](docs/demo.gif)

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

In the `config.js` we define the mapping for github orgs and repos to the dishes:

```js
// config.js

module.exports = {
    // the base directory for the dishes defined below
    baseDir: path.join(__dirname, 'dishes'),

    orgs: {
        'demo': {
            repos: {
                'petri': {
                    code: 'github_soupdemo_code',
                    content: 'github_soupdemo_content'
                }
            }
        }
    }
};
```

The `sever.js` provides a simple _express_ server that resolves the path to the respective _strain_, which is a 
code + content configuration. Please note that the exact definition and usage of _strains_ need to be 
elaborated. 

The url has the format: `/<org>/<repo>/<branch>/<resource>` and is then resolved to the respective markdown file
located in the `content` dish. 

The markdown file is converted to JSON using the (usual) [md2json](../md2json) converter. The resulting JSON also contains
the name of the template, extracted from the _frontmatter_. This is then resolved to a `.htl` template inside
the `code` dish.

The `.htl` script is compiled into JavaScript using the [htlengine](../htlengine) and finally executed, using the 
resource JSON that was previously extracted from the markdown.

  
