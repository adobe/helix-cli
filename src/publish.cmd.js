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
const request = require('request-promise-native');
const chalk = require('chalk');
const path = require('path');
const URI = require('uri-js');
const glob = require('glob-to-regexp');
const { toBase64 } = require('request/lib/helpers');
const ProgressBar = require('progress');
const Promise = require('bluebird');
const strainconfig = require('./strain-config-utils');
const include = require('./include-util');
const GitUtils = require('./gitutils');
const useragent = require('./user-agent-util');
const cli = require('./cli-util');

const HELIX_VCL_DEFAULT_FILE = path.resolve(__dirname, '../layouts/fastly/helix.vcl');

class PublishCommand {
  constructor() {
    this._wsk_auth = null;
    this._wsk_namespace = null;
    this._wsk_host = null;
    this._fastly_namespace = null;
    this._fastly_auth = null;
    this._dryRun = false;
    this._strainFile = path.resolve(process.cwd(), '.hlx', 'strains.yaml');
    this._strains = null;
    this._vclFile = path.resolve(process.cwd(), '.hlx', 'helix.vcl');

    this._service = null;
    this._options = {
      headers: {
        'User-Agent': useragent,
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
      strain_github_static_repos: null,
      strain_github_static_owners: null,
      strain_github_static_refs: null,
      strain_github_static_magic: null,
      strain_github_static_root: null,
      strain_index_files: null,
      strain_allow: null,
      strain_deny: null,
    };

    this._backends = {
      GitHub: {
        hostname: 'raw.githubusercontent.com',
        error_threshold: 0,
        first_byte_timeout: 15000,
        weight: 100,
        address: 'raw.githubusercontent.com',
        connect_timeout: 1000,
        name: 'GitHub',
        port: 443,
        between_bytes_timeout: 10000,
        shield: 'iad-va-us',
        ssl_cert_hostname: 'githubusercontent.com',
        max_conn: 200,
        use_ssl: true,
      },
      AdobeRuntime: {
        hostname: 'adobeioruntime.net',
        error_threshold: 0,
        first_byte_timeout: 60000,
        weight: 100,
        address: 'adobeioruntime.net',
        connect_timeout: 1000,
        name: 'AdobeRuntime',
        port: 443,
        between_bytes_timeout: 10000,
        shield: 'iad-va-us',
        ssl_cert_hostname: 'adobeioruntime.net',
        max_conn: 200,
        use_ssl: true,
      },
    };
  }

  progressBar() {
    if (this._bar) {
      return this._bar;
    }

    // number of backends
    const backends = Object.keys(this._backends).length;
    // number of dictionaries
    const dictionaries = Object.keys(this._dictionaries).length;
    // number of non-strain-specific dictionaries
    const staticdictionaries = 1;
    const strains = this._strains.length;
    const vclfiles = 3;
    const extrarequests = 3;

    const ticks = 
      backends + 
      dictionaries + 
      (strains * (dictionaries - staticdictionaries)) +
      vclfiles +
      extrarequests;
    this._bar = new ProgressBar('publishing [:bar] :etas', { total: ticks, width:50, renderThrottle: 1});
    
    return this._bar;
  }

  loadStrains() {
    const content = fs.readFileSync(this._strainFile);
    this._strains = strainconfig.load(content);
    if (this._strains.filter(strain => strain.name === 'default').length !== 1) {
      throw new Error(`${this._strainFile} must include one strain 'default'`);
    }
    return this._strains;
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

  withStrainFile(value) {
    this._strainFile = value;
    this.loadStrains();
    return this;
  }

  withVclFile(value) {
    this._vclFile = value;
    return this;
  }

  /**
   * Prepares a request to the Fastly API for the current service, using a given path extension
   * @param {String} pathext the path extension
   */
  options(pathext) {
    return Object.assign({ uri: `https://api.fastly.com/service/${this._fastly_namespace}${pathext}` }, this._options);
  }

  /**
   * Prepares a request to the Fastly APU for the current version of the current service,
   * using a given path extension
   * @param {String} pathext the path extension
   */
  async version(pathext) {
    const ver = await this.getCurrentVersion();
    return this.options(`/version/${ver}${pathext}`);
  }

  /**
   * Prepares a PUT request to the Fastly API, setting a given value for a given path extension
   */
  putOpts(pathext, value) {
    const ver = this.options(pathext);
    return Object.assign({
      method: 'PUT',
      form: {
        item_value: value,
      },
    }, ver);
  }

  /**
   * Prepares a DELETE request to the Fastly API, removing a given value for a given path extension
   */
  deleteOpts(pathext) {
    const ver = this.options(pathext);
    return Object.assign({
      method: 'DELETE',
    }, ver);
  }

  /**
   * Prepares a GET request to the Fastly API, removing a given value for a given path extension
   */
  getOpts(pathext) {
    const ver = this.options(pathext);
    return Object.assign({
      method: 'GET',
    }, ver);
  }

  /**
   * Prepares a PUT request to the Fastly API at the latest service version
   */
  async putVersionOpts(pathext) {
    const ver = await this.version(pathext);
    return Object.assign({ method: 'PUT' }, ver);
  }

  /**
   * Pulls the service configuration from the Fastly API
   * @param {boolean} refresh
   */
  async getService(refresh) {
    if (!this._service || refresh) {
      try {
        this._service = await request(this.options(''));
      } catch (e) {
        console.error('Unable to get service', e);
        throw e;
      }
    }
    return this._service;
  }

  /**
   * Determines the latest version of the service
   */
  async getCurrentVersion() {
    if (this._version) {
      return this._version;
    }
    const service = await this.getService();
    return [...service.versions].pop().number;
  }

  /**
   * Refreshes the map of edge dictionaries defined in the service
   */
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

  /**
   * Refreshes the map of backends defined in the service
   */
  async getBackends() {
    // if there are backends without an created_at record, they haven't
    // been fetched from the service yet
    if (Object.values(this._backends).some(e => e.created_at == null)) {
      const opts = await this.version('/backend');
      const backs = await request(opts);
      Object.values(backs).map((back) => {
        if (!back.deleted_at) {
          this._backends[back.name] = back;
        }
        return back.name;
      });
    }

    return this._backends;
  }

  /**
   * Creates edge dictionaries in the service config
   */
  async initDictionaries() {
    const dictionaries = await this.getDictionaries();
    const missingdicts = Object.entries(dictionaries)
      .filter(([_key, value]) => value === null)
      .map(([key, _value]) => key);
      this.progressBar().tick(Object.entries(dictionaries).length - missingdicts.length);
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
          this.progressBar().tick();
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

  /**
   * Creates backends in the service config
   */
  async initBackends() {
    const backends = await this.getBackends();
    const missingbackends = Object.entries(backends)
      .filter(([_key, value]) => value.created_at === undefined)
      .map(([_key, value]) => value);
    this.progressBar().tick(Object.entries(backends).length - missingbackends.length);
    if (missingbackends.length > 0) {
      const baseopts = await this.version('/backend');
      return Promise.all(missingbackends.map(async (backend) => {
        const opts = Object.assign({
          method: 'POST',
          form: backend,
        }, baseopts);
        try {
          const r = await request(opts);
          this.progressBar().tick();
          return r;
        } catch (e) {
          const message = `Backend ${backend.name} could not be created`;
          console.error(message);
          console.error(e.message);
          throw new Error(message, e);
        }
      }));
    }
    return Promise.resolve();
  }


  /**
   * Clones an existing configuration version. Returns a promise.
   */
  async cloneVersion() {
    const cloneOpts = await this.putVersionOpts('/clone');
    return request(cloneOpts).then((r) => {
      this._version = r.number;
      this.progressBar().tick();
      return Promise.resolve(this);
    })
      .catch((e) => {
        const message = 'Unable to create new service version';
        console.error(message);
        console.error(e);
        throw new Error(message, e);
      });
  }

  /**
   * Publishes the latest (cloned) service version. Returns a promise.
   */
  async publishVersion() {
    const actOpts = await this.putVersionOpts('/activate');
    return request(actOpts).then((r) => {
      this.progressBar().tick();
      this._version = r.number;
      return Promise.resolve(this);
    })
      .catch((e) => {
        const message = 'Unable to activate new configuration';
        console.error(message);
        console.error(e);
        throw new Error(message, e);
      });
  }

  /**
   * Sets a value in a named edge dictionary
   * @param {String} dict dictionary name
   * @param {String} key
   * @param {String} value
   */
  async putDict(dict, key, value) {
    await this.getDictionaries();
    const mydict = this._dictionaries[dict];
    if (!mydict) {
      console.error(`${dict} does not exist`);
      return null;
    }
    if (value) {
      const opts = await this.putOpts(`/dictionary/${mydict}/item/${key}`, value);
      return request(opts);
    }
    try {
      const opts = await this.deleteOpts(`/dictionary/${mydict}/item/${key}`);
      await request(opts);
    } catch (e) {
      // ignore
    }
    return Promise.resolve();
  }

  static vclConditions(strain) {
    if (strain.url) {
      const uri = URI.parse(strain.url);
      if (uri.path && uri.path !== '/') {
        const pathname = uri.path.replace(/\/$/, '');
        return Object.assign({
          condition: `req.http.Host == "${uri.host}" && (req.url.dirname ~ "^${pathname}$" || req.url.dirname ~ "^${pathname}/")`,
          vcl: `
  set req.http.X-Dirname = regsub(req.url.dirname, "^${pathname}", "");`,
        }, strain);
      }
      return Object.assign({
        condition: `req.http.Host == "${uri.host}"`,
      }, strain);
    }
    return strain;
  }

  /**
   * Generates VCL for strain resolution from a list of strains
   */
  static getStrainResolutionVCL(strains) {
    let retvcl = '# This file handles the strain resolution\n';
    const conditions = strains
      .map(PublishCommand.vclConditions)
      .filter(strain => strain.condition)
      .map(({ condition, name, vcl = '' }) => `if (${condition}) {
  set req.http.X-Strain = "${name}";${vcl}
} else `);
    if (conditions.length) {
      retvcl += conditions.join('');
      retvcl += `{
  set req.http.X-Strain = "default";
}`;
    } else {
      retvcl += 'set req.http.X-Strain = "default";\n';
    }
    return retvcl;
  }

  /**
   * Turns a list of parameter names into a regular expression string.
   * @param {Array(String)} params a list of parameter names
   */
  static makeFilter(params) {
    return `^(${[...params, 'hlx_.*'].join('|')})$`;
  }

  static makeParamWhitelist(params, indent = '') {
    return `set req.http.X-Old-Url = req.url;
set req.url = querystring.regfilter_except(req.url, "${PublishCommand.makeFilter(params)}");
set req.http.X-Encoded-Params = urlencode(req.url.qs);
set req.url = req.http.X-Old-Url;`
      .split('\n')
      .map(line => indent + line)
      .join('\n');
  }

  /**
   * Generates VCL for strain resolution from a list of strains
   */
  static getStrainParametersVCL(strains) {
    let retvcl = '# This file handles the URL parameter whitelist\n\n';
    const [defaultstrain] = strains.filter(strain => strain.name === 'default');
    if (defaultstrain && defaultstrain.params && Array.isArray(defaultstrain.params)) {
      retvcl += '# default parameters, can be overridden per strain\n';
      retvcl += PublishCommand.makeParamWhitelist(defaultstrain.params);
    }
    const otherstrains = strains
      .filter(strain => strain.name !== 'default')
      .filter(strain => strain.params && Array.isArray(strain.params));

    retvcl += otherstrains.map(({ name, params }) => `

if (req.http.X-Strain == "${name}") {
${PublishCommand.makeParamWhitelist(params, '  ')}
}
`);
    return retvcl;
  }

  static getXVersionExtensionVCL(configVersion, cliVersion, revision) {
    let retvcl = '# This section handles the strain resolution\n';

    const version = `; src=${configVersion}; cli=${cliVersion}; rev=${revision}`;

    retvcl += `set req.http.X-Version = req.http.X-Version + "${version}";\n`;

    return retvcl;
  }

  async setStrainsVCL() {
    const vcl = PublishCommand.getStrainResolutionVCL(this._strains);
    return this.transferVCL(vcl, 'strains.vcl');
  }

  async setParametersVCL() {
    const vcl = PublishCommand.getStrainParametersVCL(this._strains);
    return this.transferVCL(vcl, 'params.vcl');
  }

  async getVersionVCLSection() {
    const configVersion = await this.getCurrentVersion();
    const cliVersion = cli.getVersion();
    const revision = GitUtils.getCurrentRevision();

    return PublishCommand.getXVersionExtensionVCL(configVersion, cliVersion, revision);
  }

  async setDynamicVCL() {
    const vcl = await this.getVersionVCLSection();
    return this.transferVCL(vcl, 'dynamic.vcl');
  }

  async vclopts(name, vcl) {
    const baseopts = await this.version(`/vcl/${name}`);
    const postopts = await this.version('/vcl');
    // making a get request to probe if the VCL already exists
    return request.get(baseopts).then(() =>
      // eslint-disable-next-line implicit-arrow-linebreak
      Object.assign({
        method: 'PUT',
        form: {
          name,
          content: vcl,
        },
      }, baseopts)).catch((e) => {
      if (e.response.statusCode === 404) {
      // create new
        return Object.assign({
          method: 'POST',
          form: {
            name,
            content: vcl,
          },
        }, postopts);
      }
      return e;
    });
  }

  /**
   * Creates or updates a VCL file in the service with the given VCL code
   * @param {String} vcl code
   * @param {String} name name of the file
   * @param {boolean} isMain this the main VCL
   */
  async transferVCL(vcl, name, isMain = false) {
    const opts = await this.vclopts(name, vcl);
    return request(opts)
      .then(async (r) => {
        this.progressBar().tick();
        if (isMain) {
          const mainbaseopts = await this.version(`/vcl/${name}/main`);
          const mainopts = Object.assign({ method: 'PUT' }, mainbaseopts);
          return request(mainopts).then((_s) => {
            this.progressBar().tick();
          });
        }
        return r;
      })
      .catch((e) => {
        const message = `Unable to update VCL ${name}`;
        console.error(message);
        console.error(e.message);
        throw new Error(message, e);
      });
  }

  /**
   * Purges the entire Fastly cache for the given service version.
   */
  async purgeAll() {
    const baseopts = this.options('/purge_all');
    const opts = Object.assign({
      method: 'POST',
    }, baseopts);
    return request(opts).then((r) => {
      this.progressBar().tick();
      return r;
    })
      .catch((e) => {
        const message = 'Cache could not be purged';
        console.error(message);
        console.error(e);
        throw new Error(message, e);
      });
  }

  async initFastly() {
    return this.initBackends();
  }

  async setHelixVCL() {
    const vclfile = fs.existsSync(this._vclFile) ? this._vclFile : HELIX_VCL_DEFAULT_FILE;
    try {
      const content = include(vclfile);
      return this.transferVCL(content, 'helix.vcl', true);
    } catch (e) {
      console.error(`❌  Unable to set ${vclfile}`);
      throw e;
    }
  }

  showNextStep() {
    const strains = this._strains;

    const urls = strains.filter(strain => strain.url).map(strain => strain.url);
    this.progressBar().terminate();

    console.log(`✅  All strains have been published and version ${this._version} is now online.`);
    if (urls.length) {
      console.log('\nYou now access your site using:');
      console.log(chalk.grey(`$ curl ${urls[0]}`));
    }
  }

  /**
   * Turns a list of globs into a regular expression string.
   * @param {Array(String)} globs a list of globs
   */
  static makeRegexp(globs) {
    return globs.map(glob).map(re => re.toString().replace(/^\/|\/$/g, '')).join('|');
  }

  async _updateFastly() {
    this.progressBar();

    await this.cloneVersion();
    await this.initFastly();
    await this.initDictionaries();

    const owsecret = `Basic ${toBase64(`${this._wsk_auth}`)}`;
    const secretp = this.putDict('secrets', 'OPENWHISK_AUTH', owsecret).then((_s) => {
      this.progressBar().tick();
    })
      .catch((e) => {
        const message = 'OpenWhisk authentication could not be passed on';
        console.error(message);
        console.error(e);
        throw new Error(message, e);
      });

    const ownsp = this.putDict('secrets', 'OPENWHISK_NAMESPACE', this._wsk_namespace).then((_s) => {
      this.progressBar().tick();
    })
      .catch((e) => {
        const message = 'OpenWhisk namespace could not be passed on';
        console.error(message);
        console.error(e);
        throw new Error(message, e);
      });

    const strains = this._strains;

    const strainjobs = [];
    strains.map((strain) => {
      const makeStrainjob = (dictname, strainname, strainvalue, message) => {
        if (strainvalue) {
          const job = this.putDict(dictname, strainname, strainvalue)
            .then(() => {
              this.progressBar().tick();
            })
            .catch((e) => {
              const msg = 'Error setting edge dictionary value';
              console.error(msg);
              console.error(e);
              throw new Error(msg, e);
            });

          strainjobs.push(job);
        }
      };

      // required
      makeStrainjob('strain_action_roots', strain.name, strain.code, '👾  Set action root');
      makeStrainjob('strain_owners', strain.name, strain.content.owner, '🏢  Set content owner');
      makeStrainjob('strain_repos', strain.name, strain.content.repo, '🌳  Set content repo');
      makeStrainjob('strain_refs', strain.name, strain.content.ref, '🏷  Set content ref');

      // optional
      makeStrainjob('strain_index_files', strain.name, strain.index, '🗂  Set directory index');
      makeStrainjob('strain_root_paths', strain.name, strain.content.root, '🌲  Set content root');

      // static
      const origin = GitUtils.getOriginURL();

      if (strain.static && strain.static.repo) {
        makeStrainjob('strain_github_static_repos', strain.name, strain.static.repo, '🌳  Set static repo');
      } else {
        makeStrainjob('strain_github_static_repos', strain.name, origin.repo, '🌳  Set static repo to current repo');
      }

      if (strain.static && strain.static.owner) {
        makeStrainjob('strain_github_static_owners', strain.name, strain.static.owner, '🏢  Set static owner');
      } else {
        makeStrainjob('strain_github_static_owners', strain.name, origin.owner, '🏢  Set static owner to current owner');
      }

      if (strain.static && strain.static.ref) {
        makeStrainjob('strain_github_static_refs', strain.name, strain.static.ref, '🏷  Set static ref');
      } else {
        // TODO: replace ref with sha for better performance and lower risk of hitting rate limits
        makeStrainjob('strain_github_static_refs', strain.name, origin.ref, '🏷  Set static ref to current ref');
      }

      if (strain.static && strain.static.root) {
        makeStrainjob('strain_github_static_root', strain.name, strain.static.root, '🌲  Set static root');
      } else {
        this.progressBar().tick();
      }

      if (strain.static && strain.static.magic) {
        makeStrainjob('strain_github_static_magic', strain.name, strain.static.magic ? 'true' : 'false', strain.static.magic ? '🔮  Enable magic' : '⚽️  Disable magic');
      } else {
        makeStrainjob('strain_github_static_magic', strain.name, 'false', '⚽️  Disable magic');
      }

      if (strain.static && strain.static.allow) {
        const allow = PublishCommand.makeRegexp(strain.static.allow);
        makeStrainjob('strain_allow', strain.name, allow, '⚪️  Set whitelist');
      } else {
        this.progressBar().tick();
      }

      if (strain.static && strain.static.deny) {
        const deny = PublishCommand.makeRegexp(strain.static.deny);
        makeStrainjob('strain_deny', strain.name, deny, '⚫️  Set blacklist');
      } else {
        this.progressBar().tick();
      }
      return strain;
    });

    // wait for all dict updates to complete
    await Promise.all(strainjobs);

    // set all dependent VCL files
    await Promise.all([
      this.setStrainsVCL(),
      this.setDynamicVCL(),
      this.setParametersVCL(),
    ]);
    // then set the master VCL file
    await this.setHelixVCL();

    await secretp;
    // also wait for the openwhisk namespace
    await ownsp;
  }

  async run() {
    this.loadStrains();
    try {
      await this._updateFastly();
      this.progressBar().tick();
      await this.publishVersion();
      await this.purgeAll();

      this.showNextStep();
    } catch (e) {
      const message = 'Error while running the Publish command';
      console.error(message);
      console.error(e);
      throw new Error(message, e);
    }
  }
}
module.exports = PublishCommand;
