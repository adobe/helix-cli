#!/bin/sh

# argument: [ref=master] reference (branch/tag) to checkout
if [ -z "$1" ]
then
  ref="master"
else  
  ref=$1
fi

# nodec packs node v8.9.1 runtime into the binary
# the installed node version for this build must be v8.*
req_node_version="8"  

echo
echo "building hlx installer ($ref)..."
echo 

install_script=hlx_install.sh

# create temporary work dir
mkdir tmp
cd tmp

# install if-node-version
echo
echo "installing if-node-version..."
echo
mkdir node_modules
npm i if-node-version --silent

# check current node version
echo
echo "checking node.js version..."
echo
node_modules/.bin/if-node-version $req_node_version
if [ $? -ne 0 ]
then
  echo
  echo "node.js version 8.* required for building binary, aborting..."
  echo
  exit 1
fi

# install makeself
echo
echo "installing makeself..."
echo
curl -LO https://github.com/megastep/makeself/releases/download/release-2.4.0/makeself-2.4.0.run
chmod +x makeself-2.4.0.run
./makeself-2.4.0.run
cp makeself-2.4.0/*.sh .

# install node-packer (nodec)
# prerequisites: sqhashfs
echo
echo "installing squashfs..."
echo
brew install squashfs
# nodec
echo
echo "installing nodec..."
echo
curl -L https://github.com/adobe/node-packer/releases/download/v1.6.0/nodec-darwin-x64.gz | gunzip > nodec
chmod +x nodec

# clone helix-cli
echo
echo "cloning helix-cli ($ref)"
echo
git clone https://github.com/adobe/helix-cli.git
# build executable (a.out)
cd helix-cli
git checkout $ref
retVal=$?
if [ $retVal -ne 0 ]; then
    echo "unknown tag/ref: '$ref', aborting"
    cd ../..
    rm -rf tmp
    exit $retval
fi
cp index.js hlx

echo
echo "resolving dependencies and cleanup..."
echo
npm i --production
rm -rf .circleci .github .vscode .eslint* test node_modules/calibre/bin

echo
echo "running nodec..."
echo
../nodec -r . --skip-npm-install hlx

cp a.out ../../archive
cd ..

# make installer script
echo
echo "running makeself..."
echo
./makeself.sh --nox11 ../archive ./$install_script "SFX installer for hlx" ./install.sh

echo
echo "copy generated script to ../$install_script"
echo
cp $install_script ..

# cleanup: remove temporary work dir
echo
echo "cleaning up..."
echo
cd ..
rm -rf tmp
rm archive/a.out

ls -al $install_script
echo
echo "Done!"
