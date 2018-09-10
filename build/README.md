# Binary `hlx` installer

Installer for the [Helix Command Line Interface (`hlx`)](https://github.com/adobe/helix-cli).

## Build the installer

Basically:

* `nvm use 8` (required by current `nodec`)
* use [`nodec`](https://github.com/pmq20/node-packer) to build a single binary executable of the [Helix CLI](https://github.com/adobe/helix-cli).
* use [makeself](https://github.com/megastep/makeself) to build a self-extractable installer shell script.

For details see [`build.sh`](build.sh).

See also [this article](https://www.armedia.com/blog/create-a-self-extracting-installer-in-linux/).
  
## Run the installer

```bash
# download installer script
curl -OL https://github.com/adobe/helix-cli/releases/download/v0.5.2/hlx_install.sh
chmod +x hlx_install.sh
# run installer
./hlx_install.sh
# verify install
ls -al /usr/local/bin/hlx
hlx --help
# cleanup
rm hlx_install.sh
```
