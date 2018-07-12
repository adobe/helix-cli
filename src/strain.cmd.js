/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint no-console: off */

const fs = require('fs-extra');
const request = require('request-promise');
const path = require('path');
const { toBase64 } = require('request/lib/helpers');
const strainconfig = require('./strain-config');
const STRAIN_FILE = path.resolve(process.cwd(), '.hlx', 'strains.yaml');


class StrainCommand {
  constructor() {
    this._wsk_auth = null;
    this._wsk_namespace = null;
    this._wsk_host = null;
    this._fastly_namespace = null;
    this._fastly_auth = null;
    this._dryRun = false;

    this._service = null;
    this._options = {
      headers: {
        'User-Agent': 'Project Helix CLI',
        'Accept': 'application/json'
      },
      json: true
    };

    this._version = null;

    this._dictionaries = {
      secrets: null,
      strain_action_roots: null,
      strain_owners: null,
      strain_refs: null,
      strain_repos: null,
      strain_root_paths: null
    };
  }

  withWskHost(value) {
    this._wsk_host = value;
    return this;
  }

  withWskAuth(value) {
    this._wsk_auth = value;
    return this;
  }

  withWskNamespace(value) {
    this._wsk_namespace = value;
    return this;
  }

  withFastlyNamespace(value) {
    this._fastly_namespace = value;
    return this;
  }

  withFastlyAuth(value) {
    this._fastly_auth = value;
    this._options.headers['Fastly-Key'] = value;
    return this;
  }

  withDryRun(value) {
    this._dryRun = value;
    return this;
  }

  options(path) {
    return Object.assign({uri: `https://api.fastly.com/service/${this._fastly_namespace}${path}`}, this._options);
  }

  async version(path) {
    const ver = await this.getCurrentVersion()
    return this.options('/version/' + ver + path);
  }

  putOpts(path, value) {
    const ver = this.options(path);
    return Object.assign({method: 'PUT', form: {
      item_value: value
    }}, ver);
  }

  async putVersionOpts(path) {
    const ver = await this.version(path);
    return Object.assign({method: 'PUT'}, ver);
  }

  async getService(refresh) {
    if (!this._service||refresh) {
      this._service = await request(this.options(''));
    }
    return this._service;
  }

  async getCurrentVersion() {
    if (this._version) {
      return this._version;
    }
    const service = await this.getService();
    return [...service.versions].pop().number;
  }

  async getDictionaries() {
    // if there are undefined dictionaries, we have to reload them
    if (Object.values(this._dictionaries).some(e => e == null)) {
      const opts = await this.version('/dictionary');
      const dicts = await request(opts);
      Object.values(dicts).map(dict => {
        if (!dict.deleted_at) {
          this._dictionaries[dict.name] = dict.id;
        }
      });
    }

    return this._dictionaries;
  }

  async cloneVersion(next) {
    const cloneOpts = await this.putVersionOpts('/clone');
    return request(cloneOpts).then(r => {
      console.log('🐑  Cloned latest version, version ' + r.number + ' is ready');
      this._version = r.number;
      if (next) {
        next(r);
      }
    });
  }

  async publishVersion(next) {
    const actOpts = await this.putVersionOpts('/activate');
    return request(actOpts).then(r => {
      console.log('🚀  Activated latest version, version ' + r.number + ' is live');
      this._version = r.number;
      if (next) {
        next(r);
      }
    });
  }

  async putDict(dict, key ,value) {
    await this.getDictionaries();
    const mydict =this._dictionaries[dict];
    if (!mydict) {
      console.log(dict + '  does not exist');
    } else {
      const opts = await this.putOpts('/dictionary/' + mydict + '/item/' + key, value);
      return await request(opts);
    }
  }

  async run() {
    console.log('Publishing strains');

    this.cloneVersion((r) => {
      this.publishVersion(r => {
        console.log(r);
      })
    });

    return; //for now

    const owsecret = "Basic " + toBase64(this._wsk_namespace + ':' + this._wsk_auth);
    this.putDict('secrets', 'OPENWHISK_AUTH', owsecret).then(r => {
      console.log('🗝  Enabled Fastly to call secure OpenWhisk actions');
    });

    fs.readFile(STRAIN_FILE, (err, content) => {
      if (!err) {
        const strains = strainconfig.load(content);
        strains.map(strain => {
          this.putDict('strain_action_roots', strain.name ,strain.code).then(r => {
            console.log('👾  Set action root for strain ' + strain.name);
          });
          this.putDict('strain_owners', strain.name ,strain.content.owner).then(r => {
            console.log('🏢  Set owner for strain       ' + strain.name);
          });
          this.putDict('strain_repos', strain.name ,strain.content.repo).then(r => {
            console.log('🌳  Set repo for strain        ' + strain.name);
          });
          if (strain.content.ref) {
            this.putDict('strain_refs', strain.name ,strain.content.ref).then(r => {
              console.log('🏷  Set ref for strain         ' + strain.name);
            });
          }       
        });
      }
    })

    return this;
  }
}
module.exports = StrainCommand;
