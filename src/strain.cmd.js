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
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */

const fs = require('fs-extra');
const request = require('request-promise');
const Promise = require('bluebird');
const path = require('path');
const { toBase64 } = require('request/lib/helpers');
const strainconfig = require('./strain-config-utils');

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
        Accept: 'application/json',
      },
      json: true,
    };

    this._version = null;

    this._dictionaries = {
      secrets: null,
      strain_action_roots: null,
      strain_owners: null,
      strain_refs: null,
      strain_repos: null,
      strain_root_paths: null,
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

  options(pathext) {
    return Object.assign({ uri: `https://api.fastly.com/service/${this._fastly_namespace}${pathext}` }, this._options);
  }

  async version(pathext) {
    const ver = await this.getCurrentVersion();
    return this.options(`/version/${ver}${pathext}`);
  }

  putOpts(pathext, value) {
    const ver = this.options(pathext);
    return Object.assign({
      method: 'PUT',
      form: {
        item_value: value,
      },
    }, ver);
  }

  async putVersionOpts(pathext) {
    const ver = await this.version(pathext);
    return Object.assign({ method: 'PUT' }, ver);
  }

  async getService(refresh) {
    if (!this._service || refresh) {
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
      Object.values(dicts).map((dict) => {
        if (!dict.deleted_at) {
          this._dictionaries[dict.name] = dict.id;
        }
        return dict.id;
      });
    }

    return this._dictionaries;
  }

  async initDictionaries() {
    const dictionaries = await this.getDictionaries();
    const missingdicts = Object.entries(dictionaries)
      .filter(([_key, value]) => value === null)
      .map(([key, _value]) => key);
    if (missingdicts.length > 0) {
      const baseopts = await this.version('/dictionary');
      missingdicts.map((dict) => {
        const opts = Object.assign({
          method: 'POST',
          form: {
            name: dict,
            write_only: true,
          },
        }, baseopts);
        return request(opts).then((r) => {
          console.log(`📕  Dictionary ${r.name} has been created`);
          return r;
        })
          .catch((e) => {
            const message = `Dictionary ${dict} could not be created`;
            console.error(message);
            console.error(e);
            throw new Error(message, e);
          });
      });
    }
  }

  async cloneVersion(next) {
    const cloneOpts = await this.putVersionOpts('/clone');
    return request(cloneOpts).then((r) => {
      console.log(`🐑  Cloned latest version, version ${r.number} is ready`);
      this._version = r.number;
      if (next) {
        next(r);
      }
    })
      .catch((e) => {
        const message = 'Unable to create new service version';
        console.error(message);
        console.error(e);
        throw new Error(message, e);
      });
  }

  async publishVersion(next) {
    const actOpts = await this.putVersionOpts('/activate');
    return request(actOpts).then((r) => {
      console.log(`🚀  Activated latest version, version ${r.number} is live`);
      this._version = r.number;
      if (next) {
        next(r);
      }
    })
      .catch((e) => {
        const message = 'Unable to activate new configuration';
        console.error(message);
        console.error(e);
        throw new Error(message, e);
      });
  }

  async putDict(dict, key, value) {
    await this.getDictionaries();
    const mydict = this._dictionaries[dict];
    if (!mydict) {
      console.error(`${dict}  does not exist`);
      return null;
    }
    const opts = await this.putOpts(`/dictionary/${mydict}/item/${key}`, value);
    return request(opts);
  }

  static getVCL(strains) {
    return `${strains
      .filter(strain => strain.condition)
      .reduce(
        (vcl, { name, condition }) =>
        // the following is in VCL (Varnish Configuration Language) syntax
          `${vcl}if (${condition}) {
  set req.http.X-Strain = "${name}";
} else `
        , '# This file handles the strain resolution\n',
      )} {
  set req.http.X-Strain = "default";
}`;
  }

  async setVCL(vcl, name) {
    const baseopts = await this.version(`/vcl/${name}`);
    const opts = Object.assign({
      method: 'PUT',
      form: {
        name,
        content: vcl,
      },
    }, baseopts);
    return request(opts)
      .then((r) => {
        console.log(`✅  VCL ${r.name} has been updated`);
        return r;
      })
      .catch((e) => {
        const message = `Unable to update VCL ${name}`;
        console.error(message);
        console.error(e);
        throw new Error(message, e);
      });
  }

  async purgeAll() {
    const baseopts = this.options('/purge_all');
    const opts = Object.assign({
      method: 'POST',
    }, baseopts);
    return request(opts).then((r) => {
      console.log('💀  Purged entire cache');
      return r;
    })
      .catch((e) => {
        const message = 'Cache could not be purged';
        console.error(message);
        console.error(e);
        throw new Error(message, e);
      });
  }

  async run() {
    console.log('🐑 👾 🚀  hlx is publishing strains');

    this.cloneVersion((_r) => {
      this.initDictionaries();


      const owsecret = `Basic ${toBase64(`${this._wsk_auth}`)}`;
      this.putDict('secrets', 'OPENWHISK_AUTH', owsecret).then((_s) => {
        console.log('🗝  Enabled Fastly to call secure OpenWhisk actions');
      })
        .catch((e) => {
          const message = 'OpenWhisk authentication could not be passed on';
          console.error(message);
          console.error(e);
          throw new Error(message, e);
        });

      fs.readFile(STRAIN_FILE, (err, content) => {
        if (!err) {
          const strains = strainconfig.load(content);

          const strainsVCL = StrainCommand.getVCL(strains);
          this.setVCL(strainsVCL, 'strains.vcl');


          const strainjobs = [];
          strains.map((strain) => {
            strainjobs.push(this.putDict('strain_action_roots', strain.name, strain.code).then(() => {
              console.log(`👾  Set action root for strain  ${strain.name}`);
            })
              .catch((e) => {
                const message = 'Error setting edge dictionary value';
                console.error(message);
                console.error(e);
                throw new Error(message, e);
              }));
            strainjobs.push(this.putDict('strain_owners', strain.name, strain.content.owner).then(() => {
              console.log(`🏢  Set owner for strain        ${strain.name}`);
            })
              .catch((e) => {
                const message = 'Error setting edge dictionary value';
                console.error(message);
                console.error(e);
                throw new Error(message, e);
              }));
            strainjobs.push(this.putDict('strain_repos', strain.name, strain.content.repo).then(() => {
              console.log(`🌳  Set repo for strain         ${strain.name}`);
            })
              .catch((e) => {
                const message = 'Error setting edge dictionary value';
                console.error(message);
                console.error(e);
                throw new Error(message, e);
              }));
            if (strain.content.ref) {
              strainjobs.push(this.putDict('strain_refs', strain.name, strain.content.ref).then(() => {
                console.log(`🏷  Set ref for strain          ${strain.name}`);
              })
                .catch((e) => {
                  const message = 'Error setting edge dictionary value';
                  console.error(message);
                  console.error(e);
                  throw new Error(message, e);
                }));
            }
            if (strain.content.root) {
              strainjobs.push(this.putDict('strain_root_paths', strain.name, strain.content.root).then(() => {
                console.log(`🌲  Set content root for strain ${strain.name}`);
              })
                .catch((e) => {
                  const message = 'Error setting edge dictionary value';
                  console.error(message);
                  console.error(e);
                  throw new Error(message, e);
                }));
            }
            return strain;
          });

          Promise.all(strainjobs).then(() => {
            console.log('📕  All dicts have been updated.');

            this.publishVersion(() => {
              this.purgeAll();
            });
          })
            .catch((e) => {
              const message = 'Error setting one or more edge dictionary values';
              console.error(message);
              console.error(e);
              throw new Error(message, e);
            });
        }
      });
    });

    return this;
  }
}
module.exports = StrainCommand;
