# Usage

## Rendering

### Basic HTML rendering

The demo project comes with 2 files `src/html.htl` and `src/html.pre.js` which renders HTML from the requested Markdown file. The `htl` file is the rendering template while the `pre.js` allows to interact with the payload before it gets rendered by the template.
The These files are named based on the following logic: `<selector>_<extension>.htl` and `<selector>_<extension>.pre.js`. In this case, the `selector` is undefined. They will handle all requests coming to `http://localhost:3000/**/*.html`.

The `htl` file format must respect the HTL spec, check the [htlengine](https://github.com/adobe/htlengine) for more details.
The `pre.js` file must only export a `pre` function, check the [helix-pipeline](https://github.com/adobe/helix-pipeline) for the method signature.

### Custom selector

You can define the following pair `src/myselector_html.htl` and `src/myselector_pre.js` to handle request like `http://localhost:3000/**/*.myselector.html`. You can create as many selector as you want.

One of the usage of the selectors (in combination with ESI - [Edge Server Includes](https://www.w3.org/TR/esi-lang)) could be to have multiple HTML rendering for your site. You could have 3 `htl` files (together with their `pre.js`):

1. `html.htl`
1. `homepage_html.htl`
1. `others_html.htl`

The `html.htl` file could look like this:

```html
<esi:include src="${content.dispatch_url}" />
```

The `htmp.pre.js` would be responsible to determine which of the `homepage_html.htl` or `others_html.htl` needs to be used for a given request. Here is an example where only the `index.md` file is rendered with the `homepage_html.htl` script:

```js
function pre(context, action) {
  if (context.request.path === '/index.html') {
    // home page
    context.content.dispatch_url = context.request.url.replace(/\.html/, '.homepage.html');
  } else {
    // others
    context.content.dispatch_url = context.request.url.replace(/\.html/, '.others.html');
  }
}

module.exports.pre = pre;
```

### Custom extension

If you to render a Markdown file using `xml` or `json` rendering, a default pipeline is provided for those extensions. You simply need to create a `<extension>.js` file which contains one `main` function export and that sets the `context.response.body` content. Here is an example of a `json` renderer:

```js
module.exports.main = async function main(context) {
  return {
    response: {
      body: context.content
    }
  }
};
```

This will render the full `context.content` as a `json` response.

The works because the [`json`](https://github.com/adobe/helix-pipeline/blob/master/src/defaults/json.pipe.js) and the [`xml`](https://github.com/adobe/helix-pipeline/blob/master/src/defaults/xml.pipe.js) are provided out of the box. If you need another extension, you will need to add your own "custom pipeline" too, check the next section.

### Fully custom pipeline

To create you own pipeline to have full control on the rendering process, check the [building-a-pipeline](https://github.com/adobe/helix-pipeline#building-a-pipeline) section.
