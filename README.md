Petri Dish
==========

This serves as simulator for the primordial soup setup. Instead of distributing content to different repositories, they are kept here in different directories.

This is an early POC to see how local development could work w/o running a runtime container.

![Demo](docs/demo.gif)

Setup
-----------

```
# npm doesn't want to recursively install file:// dependencies 
cd ../openwhisk-loggly-wrapper && npm install
cd ../md2json && npm install && npm link
cd ../strainconfig && npm install && npm link
cd ../petridish && npm link @adobe/md2json && npm link @adibe/strainconfig && npm install
npm start
```

### Local file system

Open http://localhost:3000/demo/index.md

This uses the content and code located on the file system under `dishes/` directory.

Note: this is useful for testing the `md2json` transformation and the `htlengine` but this setup is far from the production deployment leveraging git as a repo for content and code.
Use the local git server to for an environment closer to a production setup.

### Using the local git server

 You need to start a local git server based on local checkout of the content and code. See details for the [git-server](../git-server)

1. Follow [Setup](#Setup) steps.
2. To test the various `helpx` example, proceed as follow to checkout content and code repos and start the `git-server`:

```
cd ../git-server/repos

# clone content repo
mkdir Adobe-Marketing-Cloud
cd Adobe-Marketing-Cloud
git clone https://github.com/Adobe-Marketing-Cloud/reactor-user-docs.git
cd ..

# clone code repo
mkdir adobe
cd adobe
git clone https://github.com/adobe/helix-helpx

cd ../..
npm install && npm start
````

3. Open (see config below for details):
    1. http://localhost:3000/helpx/getting-started/README.html
    1. http://localhost:3000/helpx-remote/getting-started/README.html
    1. http://localhost:3000/helpx-mix/getting-started/README.html
    1. http://localhost:3000/helpx-v02/getting-started/README.html

How it works
------------

In the `config.js` we define the strain configurations and the location of the code and content repositories.
For local development, one can choose either a (local) git server URL or a filesystem path that points to a directory.

```js
// config.js
const baseDir = path.join(__dirname, 'dishes');

module.exports = {
    strains: {
        strains: {
            'demo': {
                // example of using the local filesystem as source
                urls: new LocalURLs({
                    code: path.join(baseDir, 'github_soupdemo_code/master'),
                    content: path.join(baseDir, 'github_soupdemo_content/master')
                }),
                cache: path.join(baseDir, 'tmp', 'demo')
            },

            'helpx': {
                // helpx using a local git server as source for content and code
                urls: new StrainURLs({
                    code: 'http://localtest.me:5000/adobe/helix-helpx',
                    content: 'http://localtest.me:5000/Adobe-Marketing-Cloud/reactor-user-docs'
                }),
                cache: path.join(baseDir, 'tmp', 'helpx')
            },

            'helpx-remote': {
                // helpx using a github as source for content and code
                urls: new StrainURLs({
                    code: 'http://github.com/adobe/helix-helpx',
                    content: 'http://github.com/Adobe-Marketing-Cloud/reactor-user-docs'
                }),
                cache: path.join(baseDir, 'tmp', 'helpx')
            },

            'helpx-mix': {
                // helpx using a github as source for content and a local git server as source for code
                urls: new StrainURLs({
                    code: 'http://localtest.me:5000/adobe/helix-helpx',
                    content: 'http://github.com/Adobe-Marketing-Cloud/reactor-user-docs'
                }),
                cache: path.join(baseDir, 'tmp', 'helpx')
            },

            'helpx-v02': {
                // helpx using a local git server as source for content and code but branch v0.1 (sample release tag) of the code.
                urls: new StrainURLs({
                    code: 'http://localtest.me:5000/adobe/helix-helpx/tree/v0.2',
                    content: 'http://localtest.me:5000/Adobe-Marketing-Cloud/reactor-user-docs/tree/master'
                }),
                cache: path.join(baseDir, 'tmp', 'helpx')
            },

        }
    }
};
```

The `server.js` provides a simple _express_ server that resolves the path to the respective _strain_, which is a 
code + content configuration. The definition and usage of _strains_ can be found [here](https://github.com/adobe/project-helix/blob/master/prototypes/README.md#strains)

The url has the format: `/<strain>/<resource>` and is then resolved to the respective markdown file located in the `content` repo / dish.

The markdown file is converted to JSON using the (usual) [md2json](../md2json) converter. The resulting JSON also contains
the name of the template, extracted from the _frontmatter_. This is then resolved to a `.htl` template inside the `code` repo / dish.

The `.htl` script is compiled into JavaScript using the [htlengine](../htlengine) and finally executed, using the 
resource JSON that was previously extracted from the markdown.

In the filesystem case, the test repositories are located int the  `dishes` directory:

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
