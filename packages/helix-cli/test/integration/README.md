# Example Strains

## Default Strain

This is the same stuff you would see during development, served from master.

```yaml
- strain:
    name: default
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty--
    content:
      repo: helix-cli
      ref: master
      owner: adobe
      root: test/integration
```

Example URLs:

- https://www.primordialsoup.life/index.html

## Preview Strain

It is just like the default, except that it is using the `25-strains` branch, which means that *this file* is accessible, too.

The `condition` is that you access it from `https://preview.primordialsoup.life`.

```yaml
- strain:
    name: preview
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty--
    condition: req.http.host == "preview.primordialsoup.life"
    content:
      repo: helix-cli
      ref: 25-strains
      owner: adobe
      root: test/integration
```

Example URLs:

- https://preview.primordialsoup.life/index.html
- https://preview.primordialsoup.life/README.html (*this very file*)

## The Original Soupdemo

You can use arbitrary content sources for your strains, so this is the original Soupdemo, served from `@trieloff`'s GitHub repo, access ible under `lars.primordialsoup.life` 

```yaml
- strain:
    name: soupdemo
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty--
    condition: req.http.host == "lars.primordialsoup.life"
    content:
      repo: soupdemo
      ref: master
      owner: trieloff
```

Example URLs:

- https://lars.primordialsoup.life/hello.html
- https://lars.primordialsoup.life/moscow/moscow.html

## Adobe XDM

Another good test site is the XDM repo, because it has a quite long `README.md`, but by now you know the drill:

```yaml
- strain:
    name: xdm
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty--
    content:
      repo: xdm
      ref: master
      owner: adobe
    condition: req.http.host == "xdm.primordialsoup.life"
```

- https://xdm.primordialsoup.life/README.html

## Launch, by Adobe

Finally, we can also access the Launch, by Adobe documentation:

```yaml
- strain:
    name: db5d4350c13924ad
    code: /trieloff/default/git-github-com-adobe-helix-cli-git--dirty--
    condition: req.http.host == "launch.primordialsoup.life"
    content:
      repo: reactor-user-docs
      ref: master
      owner: Adobe-Marketing-Cloud
```

Note the name here: if you don't bother to give your strains a proper name, we generate one ourselves.

Example URLs:

- https://launch.primordialsoup.life/administration/adapters.html
- https://launch.primordialsoup.life/README.html