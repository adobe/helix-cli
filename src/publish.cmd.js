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

/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */

const fs = require('fs-extra');
const request = require('request-promise-native');
const chalk = require('chalk');
const path = require('path');
const URI = require('uri-js');
const glob = require('glob-to-regexp');
const { toBase64 } = require('request/lib/helpers');
const ProgressBar = require('progress');
const { GitUtils } = require('@adobe/helix-shared');
const strainconfig = require('./strain-config-utils');
const include = require('./include-util');
const useragent = require('./user-agent-util');
const cli = require('./cli-util');
const AbstractCommand = require('./abstract.cmd.js');

const HELIX_VCL_DEFAULT_FILE = path.resolve(__dirname, '../layouts/fastly/helix.vcl');

class PublishCommand extends AbstractCommand {
  constructor(logger) {
    super(logger);
    this._wsk_auth = null;
    this._wsk_namespace = null;
    this._wsk_host = null;
    this._fastly_namespace = null;
    this._fastly_auth = null;
    this._dryRun = false;
    this._strainFile = path.resolve(process.cwd(), '.hlx', 'strains.json');
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

  tick(ticks = 1, message, name) {
    if (name === true) {
      // eslint-disable-next-line no-param-reassign
      name = message;
    }
    this.progressBar().tick(ticks, {
      action: name || '',
    });
    if (message) {
      this.log.log({
        progress: true,
        level: 'info',
        message,
      });
    }
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
    const extrarequests = 4;

    const ticks = backends
      + dictionaries
      + (strains * (dictionaries - staticdictionaries))
      + vclfiles
      + extrarequests;
    this._bar = new ProgressBar('Publishing [:bar] :action :etas', {
      total: ticks,
      width: 50,
      renderThrottle: 1,
      stream: process.stdout,
    });

    return this._bar;
  }

  async loadStrains() {
    const content = await fs.readFile(this._strainFile, 'utf-8');
    this._strains = strainconfig.load(content);
    if (this._strains.filter(strain => strain.name === 'default').length !== 1) {
      throw new Error(`${this._strainFile} must include one strain 'default'`);
    }
    
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
        this.log.error('Unable to get service', e);
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
    const existing = Object.entries(dictionaries).length - missingdicts.length;
    this.tick(existing, `Skipping ${existing} existing dictionaries`);
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
          this.tick(1, `Dictionary ${dict} created`, dict);
          return r;
        })
          .catch((e) => {
            const message = `Dictionary ${dict} could not be created`;
            this.log.error(message, e);
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
    const existing = Object.entries(backends).length - missingbackends.length;
    this.tick(existing, `Skipping ${existing} existing backends`);
    if (missingbackends.length > 0) {
      const baseopts = await this.version('/backend');
      return Promise.all(missingbackends.map(async (backend) => {
        const opts = Object.assign({
          method: 'POST',
          form: backend,
        }, baseopts);
        try {
          this.tick(0, `Creating backend ${backend.name}`, true);
          const r = await request(opts);
          this.tick(1, `Created backend ${backend.name}`, true);
          return r;
        } catch (e) {
          const message = `Backend ${backend.name} could not be created`;
          this.log.error(`${message}`, e);
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
    this.tick(0, 'Cloning Service Config version', 'cloning version');
    return request(cloneOpts).then((r) => {
      this._version = r.number;
      this.tick(1, `Cloned Service Config Version ${r.number}`, `cloning version ${r.number}`);
      return Promise.resolve(this);
    })
      .catch((e) => {
        const message = 'Unable to create new service version';
        this.log.error(message, e);
        throw new Error(message, e);
      });
  }

  /**
   * Publishes the latest (cloned) service version. Returns a promise.
   */
  async publishVersion() {
    const actOpts = await this.putVersionOpts('/activate');
    this.tick(0, 'Activating version', 'activating version');
    return request(actOpts).then((r) => {
      this.tick(1, `Activated version ${r.number}`, `activated version ${r.number}`);
      this._version = r.number;
      return Promise.resolve(this);
    })
      .catch((e) => {
        const message = 'Unable to activate new configuration';
        this.log.error(message, e);
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
    this.log.silly(`update dict ${dict} ${key}=${value}`);
    await this.getDictionaries();
    const mydict = this._dictionaries[dict];
    if (!mydict) {
      this.log.error(`Dictionary ${dict} does not exist. Try ${Object.keys(this._dictionaries).join(', ')}`);
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
      this.log.error(`Unknown error when deleting key ${key} from dictionary ${mydict}`, e);
    }
    return Promise.resolve();
  }

  /**
   * Creates a condition expression in VCL language that maps requests to strains.
   * @param {Strain} strain the strain to generate a condition expression for
   */
  static vclConditions(strain) {
    if (strain.url) {
      const uri = URI.parse(strain.url);
      if (uri.path && uri.path !== '/') {
        const pathname = uri.path.replace(/\/$/, '');
        return Object.assign({
          sticky: false,
          condition: `req.http.Host == "${uri.host}" && (req.url.dirname ~ "^${pathname}$" || req.url.dirname ~ "^${pathname}/")`,
          vcl: `
  set req.http.X-Dirname = regsub(req.url.dirname, "^${pathname}", "");`,
        }, strain);
      }
      return Object.assign({
        condition: `req.http.Host == "${uri.host}"`,
      }, strain);
    }
    if (strain.condition && strain.sticky === undefined) {
      return Object.assign({
        sticky: true,
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
      .map(({
        condition, name, vcl = '', sticky = false,
      }) => `if (${condition}) {
  set req.http.X-Sticky = "${sticky}";
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
   * @param {Array<String>} params a list of parameter names
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
        this.tick(1, `Uploading VCL ${name}`, true);
        if (isMain) {
          const mainbaseopts = await this.version(`/vcl/${name}/main`);
          const mainopts = Object.assign({ method: 'PUT' }, mainbaseopts);
          return request(mainopts).then(() => {
            this.tick(1, `Uploaded VCL ${name}`, true);
          });
        }
        return r;
      })
      .catch((e) => {
        const message = `Unable to update VCL ${name}`;
        this.log.error(message, e);
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
      this.tick(1, 'Purging entire cache');
      return r;
    })
      .catch((e) => {
        const message = 'Cache could not be purged';
        this.log.error(message, e);
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
      this.log.error(`❌  Unable to set ${vclfile}`);
      throw e;
    }
  }

  showNextStep() {
    const strains = this._strains;

    const urls = strains.filter(strain => strain.url).map(strain => strain.url);
    this.progressBar().terminate();

    this.log.info(`✅  All strains have been published and version ${this._version} is now online.`);
    if (urls.length) {
      this.log.info('\nYou now access your site using:');
      this.log.info(chalk.grey(`$ curl ${urls[0]}`));
    }
  }

  /**
   * Turns a list of globs into a regular expression string.
   * @param {Array<String>} globs a list of globs
   */
  static makeRegexp(globs) {
    return globs.map(glob).map(re => re.toString().replace(/^\/|\/$/g, '')).join('|');
  }

  async _updateFastly() {
    this.progressBar();

    await this.cloneVersion();
    await this.initFastly();
    await this.initDictionaries();

    const dictJobs = [];
    const makeDictJob = (dictname, strainname, strainvalue, message, shortMsg) => {
      if (strainvalue) {
        const job = this.putDict(dictname, strainname, strainvalue)
          .then(() => {
            this.tick(1, message, shortMsg);
          })
          .catch((e) => {
            const msg = 'Error setting edge dictionary value';
            this.log.error(message, e);
            throw new Error(msg, e);
          });

        dictJobs.push(job);
      }
    };

    const owsecret = `Basic ${toBase64(`${this._wsk_auth}`)}`;
    makeDictJob('secrets', 'OPENWHISK_AUTH', owsecret, 'Set OpenWhisk Authentication', 'openwhisk authentication');
    makeDictJob('secrets', 'OPENWHISK_NAMESPACE', this._wsk_namespace, 'Set OpenWhisk namespace', 'openwhisk namespace');
    const [secretp, ownsp] = dictJobs.splice(0, 2);

    const strains = this._strains;
    strains.map((strain) => {
      // required
      makeDictJob('strain_action_roots', strain.name, strain.code, '- Set action root', 'action root');
      makeDictJob('strain_owners', strain.name, strain.content.owner, '- Set content owner', 'content owner');
      makeDictJob('strain_repos', strain.name, strain.content.repo, '- Set content repo', 'content repo');
      makeDictJob('strain_refs', strain.name, strain.content.ref, '- Set content ref', 'content ref');

      // optional
      makeDictJob('strain_index_files', strain.name, strain.index, '- Set directory index', 'directory index');
      makeDictJob('strain_root_paths', strain.name, strain.content.root, '- Set content root', 'content root');

      // static
      const origin = GitUtils.getOriginURL();

      if (strain.static && strain.static.repo) {
        makeDictJob('strain_github_static_repos', strain.name, strain.static.repo, '- Set static repo', 'static repo');
      } else {
        makeDictJob('strain_github_static_repos', strain.name, origin.repo, '- Set static repo to current repo', 'static repo');
      }

      if (strain.static && strain.static.owner) {
        makeDictJob('strain_github_static_owners', strain.name, strain.static.owner, '- Set static owner', 'static owner');
      } else {
        makeDictJob('strain_github_static_owners', strain.name, origin.owner, '- Set static owner to current owner', 'static owner');
      }

      if (strain.static && strain.static.ref) {
        makeDictJob('strain_github_static_refs', strain.name, strain.static.ref, '- Set static ref', 'static ref');
      } else {
        // TODO: replace ref with sha for better performance and lower risk of hitting rate limits
        makeDictJob('strain_github_static_refs', strain.name, origin.ref, '- Set static ref to current ref', 'static ref');
      }

      if (strain.static && strain.static.path) {
        makeDictJob('strain_github_static_root', strain.name, strain.static.path, '- Set static root', 'static root');
      } else {
        // skipping: no message here
        this.tick();
      }

      if (strain.static && strain.static.magic) {
        makeDictJob(
          'strain_github_static_magic',
          strain.name, strain.static.magic ? 'true' : 'false',
          strain.static.magic ? '- Enable magic' : '- Disable magic',
          'static magic',
        );
      } else {
        makeDictJob('strain_github_static_magic', strain.name, 'false', '- Disable magic', 'static magic');
      }

      if (strain.static && strain.static.allow) {
        const allow = PublishCommand.makeRegexp(strain.static.allow);
        makeDictJob('strain_allow', strain.name, allow, '- Set whitelist', 'whitelist');
      } else {
        // skipping: no message here
        this.tick();
      }

      if (strain.static && strain.static.deny) {
        const deny = PublishCommand.makeRegexp(strain.static.deny);
        makeDictJob('strain_deny', strain.name, deny, '- Set blacklist', 'blacklist');
      } else {
        // skipping: no message here
        this.tick();
      }
      return strain;
    });

    // wait for all dict updates to complete
    await Promise.all(dictJobs);

    // set all dependent VCL files
    await Promise.all([
      this.setStrainsVCL(),
      this.setDynamicVCL(),
      this.setParametersVCL(),
    ]);
    // then set the master VCL file
    await this.setHelixVCL();

    // also wait for the openwhisk namespace
    await secretp;
    await ownsp;
  }

  async run() {
    await this.loadStrains();
    try {
      await this._updateFastly();
      this.tick(0);
      await this.publishVersion();
      await this.purgeAll();

      this.showNextStep();
    } catch (e) {
      const message = 'Error while running the Publish command';
      this.log.error(message, e);
      throw new Error(message, e);
    }
  }
}
module.exports = PublishCommand;
