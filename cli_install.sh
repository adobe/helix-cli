#!/bin/sh

# Copyright 2018 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed under
# the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
# OF ANY KIND, either express or implied. See the License for the specific language
# governing permissions and limitations under the License.

# determine latest version
version=$(curl -s https://api.github.com/repos/adobe/helix-cli/releases/latest | grep 'tag_name' | cut -d\" -f4)

echo
echo "downloading hlx installer $version ..."
echo 

# download hlx_install.sh from latest release
curl -OL $(curl -s https://api.github.com/repos/adobe/helix-cli/releases/latest | grep 'browser_download_url' | cut -d\" -f4)

echo
echo "running hlx installer $version ..."
echo 

# set executable bit
chmod +x hlx_install.sh
# run installer
./hlx_install.sh
# cleanup
rm hlx_install.sh
