## [3.2.2](https://github.com/adobe/helix-cli/compare/v3.2.1...v3.2.2) (2019-05-22)


### Bug Fixes

* **package:** update snyk to version 1.166.1 ([e6997d3](https://github.com/adobe/helix-cli/commit/e6997d3))

## [3.2.1](https://github.com/adobe/helix-cli/compare/v3.2.0...v3.2.1) (2019-05-21)


### Bug Fixes

* **package:** update snyk to version 1.165.2 ([92a03c5](https://github.com/adobe/helix-cli/commit/92a03c5))

# [3.2.0](https://github.com/adobe/helix-cli/compare/v3.1.0...v3.2.0) (2019-05-20)


### Bug Fixes

* **deploy:** do not bind or link static actions when dry running ([8635f26](https://github.com/adobe/helix-cli/commit/8635f26))


### Features

* **deploy:** bind and link hlx--static action during deployment ([e43bf28](https://github.com/adobe/helix-cli/commit/e43bf28)), closes [#850](https://github.com/adobe/helix-cli/issues/850)
* **deploy:** skip deployment of `hlx--static` when `--static=bind` ([b86c5d8](https://github.com/adobe/helix-cli/commit/b86c5d8)), closes [#850](https://github.com/adobe/helix-cli/issues/850)
* **deploy:** support binding/mounting the helix-services virtual package when `--static!=build` ([e7e87dc](https://github.com/adobe/helix-cli/commit/e7e87dc)), closes [#850](https://github.com/adobe/helix-cli/issues/850)
* **package:** skip packaging static.zip when `--static=bind` ([e561ac6](https://github.com/adobe/helix-cli/commit/e561ac6)), closes [#850](https://github.com/adobe/helix-cli/issues/850)
* **publish:** pass CLI version when calling `helix-publish` ([8c64378](https://github.com/adobe/helix-cli/commit/8c64378))
* **static:** add --static={build|bind|both} option to package and deploy commands ([2df5630](https://github.com/adobe/helix-cli/commit/2df5630)), closes [#850](https://github.com/adobe/helix-cli/issues/850)

# [3.1.0](https://github.com/adobe/helix-cli/compare/v3.0.0...v3.1.0) (2019-05-20)


### Bug Fixes

* **package:** update snyk to version 1.165.1 ([79e12f7](https://github.com/adobe/helix-cli/commit/79e12f7))


### Features

* **publish:** Support for custom VCL logic ([#893](https://github.com/adobe/helix-cli/issues/893)) ([d773f2a](https://github.com/adobe/helix-cli/commit/d773f2a))

# [3.0.0](https://github.com/adobe/helix-cli/compare/v2.5.5...v3.0.0) (2019-05-16)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 2.0.0 ([5cabcf2](https://github.com/adobe/helix-cli/commit/5cabcf2))


### Documentation

* **readme:** adjust to pipeline change ([f5a1509](https://github.com/adobe/helix-cli/commit/f5a1509))


### BREAKING CHANGES

* **readme:** The new pipeline 2.0.0 no longer merges the return
  values from pipeline functions. The context needs to manipulated
  directly.

## [2.5.5](https://github.com/adobe/helix-cli/compare/v2.5.4...v2.5.5) (2019-05-16)


### Bug Fixes

* **package:** update snyk to version 1.165.0 ([f684022](https://github.com/adobe/helix-cli/commit/f684022))
* **package:** update snyk to version 1.165.0 ([07520e6](https://github.com/adobe/helix-cli/commit/07520e6))

## [2.5.4](https://github.com/adobe/helix-cli/compare/v2.5.3...v2.5.4) (2019-05-15)


### Bug Fixes

* **package:** update @adobe/helix-shared to version 1.3.1 ([0f01236](https://github.com/adobe/helix-cli/commit/0f01236)), closes [#868](https://github.com/adobe/helix-cli/issues/868)

## [2.5.3](https://github.com/adobe/helix-cli/compare/v2.5.2...v2.5.3) (2019-05-14)


### Bug Fixes

* **parcel:** check for empty package ([8c3fe34](https://github.com/adobe/helix-cli/commit/8c3fe34))
* **parcel:** guard against missing devDependencies and missing package ([042db06](https://github.com/adobe/helix-cli/commit/042db06))
* **parcel:** make sure devdependencies is initialized ([47db87b](https://github.com/adobe/helix-cli/commit/47db87b))
* **parcel:** more robust handling of missing package.json ([455a65c](https://github.com/adobe/helix-cli/commit/455a65c)), closes [#881](https://github.com/adobe/helix-cli/issues/881)

## [2.5.2](https://github.com/adobe/helix-cli/compare/v2.5.1...v2.5.2) (2019-05-14)


### Bug Fixes

* **package:** update @adobe/helix-simulator to version 2.12.9 ([c87473b](https://github.com/adobe/helix-cli/commit/c87473b)), closes [#878](https://github.com/adobe/helix-cli/issues/878)

## [2.5.1](https://github.com/adobe/helix-cli/compare/v2.5.0...v2.5.1) (2019-05-13)


### Bug Fixes

* **package:** update fs-extra to version 8.0.1 ([4b6c833](https://github.com/adobe/helix-cli/commit/4b6c833))

# [2.5.0](https://github.com/adobe/helix-cli/compare/v2.4.1...v2.5.0) (2019-05-13)


### Features

* **build:** add basic JSX support ([aec4c8e](https://github.com/adobe/helix-cli/commit/aec4c8e)), closes [#203](https://github.com/adobe/helix-cli/issues/203)
* **build:** build JSX templates/scripts by default ([2692b49](https://github.com/adobe/helix-cli/commit/2692b49))

## [2.4.1](https://github.com/adobe/helix-cli/compare/v2.4.0...v2.4.1) (2019-05-13)


### Bug Fixes

* **package:** use correct log output for debug ([#877](https://github.com/adobe/helix-cli/issues/877)) ([de05b9d](https://github.com/adobe/helix-cli/commit/de05b9d)), closes [#870](https://github.com/adobe/helix-cli/issues/870)

# [2.4.0](https://github.com/adobe/helix-cli/compare/v2.3.0...v2.4.0) (2019-05-13)


### Features

* **script:** sanitize context before returning it to the pipeline ([#862](https://github.com/adobe/helix-cli/issues/862)) ([4861ec8](https://github.com/adobe/helix-cli/commit/4861ec8)), closes [#744](https://github.com/adobe/helix-cli/issues/744) [#861](https://github.com/adobe/helix-cli/issues/861)

# [2.3.0](https://github.com/adobe/helix-cli/compare/v2.2.5...v2.3.0) (2019-05-13)


### Bug Fixes

* **package:** update @adobe/parcel-plugin-htl to version 2.1.9 ([9f326f7](https://github.com/adobe/helix-cli/commit/9f326f7))


### Features

* **pipeline:** consistently use `context` instead of payload. ([4faf4de](https://github.com/adobe/helix-cli/commit/4faf4de)), closes [#743](https://github.com/adobe/helix-cli/issues/743)

## [2.2.5](https://github.com/adobe/helix-cli/compare/v2.2.4...v2.2.5) (2019-05-13)


### Bug Fixes

* **package:** add micromatch as dev-dependncy to resolve packageer problems ([#875](https://github.com/adobe/helix-cli/issues/875)) ([c659533](https://github.com/adobe/helix-cli/commit/c659533)), closes [#871](https://github.com/adobe/helix-cli/issues/871)

## [2.2.4](https://github.com/adobe/helix-cli/compare/v2.2.3...v2.2.4) (2019-05-13)


### Bug Fixes

* **package:** update @adobe/helix-simulator to version 2.12.8 ([c0fc3bd](https://github.com/adobe/helix-cli/commit/c0fc3bd)), closes [#874](https://github.com/adobe/helix-cli/issues/874)

## [2.2.3](https://github.com/adobe/helix-cli/compare/v2.2.2...v2.2.3) (2019-05-13)


### Bug Fixes

* **package:** update @adobe/helix-shared to version 1.3.0 ([84f091d](https://github.com/adobe/helix-cli/commit/84f091d))

## [2.2.2](https://github.com/adobe/helix-cli/compare/v2.2.1...v2.2.2) (2019-05-13)


### Bug Fixes

* **package:** update @adobe/parcel-plugin-htl to version 2.1.8 ([90c07f9](https://github.com/adobe/helix-cli/commit/90c07f9))

## [2.2.1](https://github.com/adobe/helix-cli/compare/v2.2.0...v2.2.1) (2019-05-10)


### Bug Fixes

* **package:** update snyk to version 1.163.2 ([aae07c2](https://github.com/adobe/helix-cli/commit/aae07c2))

# [2.2.0](https://github.com/adobe/helix-cli/compare/v2.1.6...v2.2.0) (2019-05-10)


### Features

* **cgi-bin:** build and deploy JS files from the cgi-bin folder ([b7f0f65](https://github.com/adobe/helix-cli/commit/b7f0f65)), closes [#436](https://github.com/adobe/helix-cli/issues/436)

## [2.1.6](https://github.com/adobe/helix-cli/compare/v2.1.5...v2.1.6) (2019-05-09)


### Bug Fixes

* **package:** update snyk to version 1.163.1 ([dd88628](https://github.com/adobe/helix-cli/commit/dd88628))

## [2.1.5](https://github.com/adobe/helix-cli/compare/v2.1.4...v2.1.5) (2019-05-09)


### Bug Fixes

* **package:** update webpack to version 4.31.0 ([1f507a9](https://github.com/adobe/helix-cli/commit/1f507a9))

## [2.1.4](https://github.com/adobe/helix-cli/compare/v2.1.3...v2.1.4) (2019-05-09)


### Bug Fixes

* **publish:** catch error when trying to merge non-existent configuration from master ([a51937e](https://github.com/adobe/helix-cli/commit/a51937e)), closes [#846](https://github.com/adobe/helix-cli/issues/846)

## [2.1.3](https://github.com/adobe/helix-cli/compare/v2.1.2...v2.1.3) (2019-05-09)


### Bug Fixes

* **publish:** fix error when no filters provided ([937a365](https://github.com/adobe/helix-cli/commit/937a365)), closes [#846](https://github.com/adobe/helix-cli/issues/846)

## [2.1.2](https://github.com/adobe/helix-cli/compare/v2.1.1...v2.1.2) (2019-05-09)


### Bug Fixes

* **package:** update @adobe/parcel-plugin-htl to version 2.1.7 ([b89ec53](https://github.com/adobe/helix-cli/commit/b89ec53))

## [2.1.1](https://github.com/adobe/helix-cli/compare/v2.1.0...v2.1.1) (2019-05-09)


### Bug Fixes

* **package:** update @adobe/parcel-plugin-htl to version 2.1.6 ([ea61f2d](https://github.com/adobe/helix-cli/commit/ea61f2d))

# [2.1.0](https://github.com/adobe/helix-cli/compare/v2.0.5...v2.1.0) (2019-05-08)


### Bug Fixes

* **package:** update snyk to version 1.163.0 ([3e96915](https://github.com/adobe/helix-cli/commit/3e96915)), closes [#841](https://github.com/adobe/helix-cli/issues/841)
* **publish:** fix loggers ([1db7669](https://github.com/adobe/helix-cli/commit/1db7669))
* **publish:** update description of `--exclude` param ([adf486f](https://github.com/adobe/helix-cli/commit/adf486f))


### Features

* **git:** helper functions for getting the contents of a file at a ref ([0b349d8](https://github.com/adobe/helix-cli/commit/0b349d8))
* **publish:** add new --only and --exclude flags for publish command line ([8739ef4](https://github.com/adobe/helix-cli/commit/8739ef4))
* **publish:** implement filtering with `--only` and `--exclude` ([e94ea52](https://github.com/adobe/helix-cli/commit/e94ea52)), closes [#821](https://github.com/adobe/helix-cli/issues/821)

## [2.0.5](https://github.com/adobe/helix-cli/compare/v2.0.4...v2.0.5) (2019-05-08)


### Bug Fixes

* **package:** update @adobe/helix-simulator to version 2.12.6 ([35bb635](https://github.com/adobe/helix-cli/commit/35bb635))

## [2.0.4](https://github.com/adobe/helix-cli/compare/v2.0.3...v2.0.4) (2019-05-08)


### Bug Fixes

* **package:** update @adobe/parcel-plugin-htl to version 2.1.5 ([a636619](https://github.com/adobe/helix-cli/commit/a636619))

## [2.0.3](https://github.com/adobe/helix-cli/compare/v2.0.2...v2.0.3) (2019-05-07)


### Bug Fixes

* **package:** update @adobe/helix-shared to version 1.2.0 ([0f1a0a2](https://github.com/adobe/helix-cli/commit/0f1a0a2))

## [2.0.2](https://github.com/adobe/helix-cli/compare/v2.0.1...v2.0.2) (2019-05-07)


### Bug Fixes

* **package:** update @adobe/helix-simulator to version 2.12.4 ([1865085](https://github.com/adobe/helix-cli/commit/1865085))

## [2.0.1](https://github.com/adobe/helix-cli/compare/v2.0.0...v2.0.1) (2019-05-07)


### Bug Fixes

* **package:** update @adobe/helix-shared to version 1.1.1 ([2e532ba](https://github.com/adobe/helix-cli/commit/2e532ba))

# [2.0.0](https://github.com/adobe/helix-cli/compare/v1.0.0...v2.0.0) (2019-05-06)


### Bug Fixes

* **package:** update @adobe/helix-shared to version 0.10.5 ([8efda26](https://github.com/adobe/helix-cli/commit/8efda26))
* **package:** update @adobe/helix-shared to version 0.11.0 ([0de812b](https://github.com/adobe/helix-cli/commit/0de812b))
* **package:** update @adobe/helix-shared to version 1.1.0 ([fabb0ab](https://github.com/adobe/helix-cli/commit/fabb0ab))
* **package:** update chokidar to version 3.0.0 ([4688a0f](https://github.com/adobe/helix-cli/commit/4688a0f))
* **package:** update dotenv to version 8.0.0 ([0786a94](https://github.com/adobe/helix-cli/commit/0786a94))
* **package:** update snyk to version 1.154.1 ([3038ec9](https://github.com/adobe/helix-cli/commit/3038ec9))
* **package:** update snyk to version 1.155.0 ([a8bb6d6](https://github.com/adobe/helix-cli/commit/a8bb6d6))
* **package:** update snyk to version 1.156.0 ([e321706](https://github.com/adobe/helix-cli/commit/e321706))
* **package:** update snyk to version 1.159.0 ([adeb477](https://github.com/adobe/helix-cli/commit/adeb477))
* **package:** update snyk to version 1.161.0 ([79be958](https://github.com/adobe/helix-cli/commit/79be958))
* **package:** update snyk to version 1.161.1 ([72ad988](https://github.com/adobe/helix-cli/commit/72ad988))
* **static:** always return entry path for 404 errors ([84fe876](https://github.com/adobe/helix-cli/commit/84fe876))
* **static:** cache error responses for 5 minutes ([4247842](https://github.com/adobe/helix-cli/commit/4247842))
* **static:** handle more 404 errors with path ([ed5a887](https://github.com/adobe/helix-cli/commit/ed5a887))
* **static:** normalize URLs in rewritten CSS and JS ([25964ba](https://github.com/adobe/helix-cli/commit/25964ba))
* **static:** prevent possible XSS by sanitizing output ([97d6387](https://github.com/adobe/helix-cli/commit/97d6387))
* **static:** return the original URL in case a static resource cannot get retieved for an ESI include ([3f6b3ff](https://github.com/adobe/helix-cli/commit/3f6b3ff)), closes [#813](https://github.com/adobe/helix-cli/issues/813)
* **static:** turn on ESI processing when ESI flag is set ([8b2436b](https://github.com/adobe/helix-cli/commit/8b2436b))
* **static:** use .url instead of .esi as extension for immutable resources ([70b9674](https://github.com/adobe/helix-cli/commit/70b9674))


### Documentation

* **changelog:** explain switchover to version 2.0 ([920b39c](https://github.com/adobe/helix-cli/commit/920b39c))


### Features

* **static:** add ESI aliasing support for JavaScript modules ([1fa564d](https://github.com/adobe/helix-cli/commit/1fa564d)), closes [/github.com/adobe/helix-pipeline/issues/224#issuecomment-476690621](https://github.com//github.com/adobe/helix-pipeline/issues/224/issues/issuecomment-476690621)
* **static:** Rewrite CSS URLs to Static ESI URLs so that better caching can be achieved ([396c55b](https://github.com/adobe/helix-cli/commit/396c55b)), closes [adobe/helix-publish#61](https://github.com/adobe/helix-publish/issues/61) [adobe/helix-pipeline#267](https://github.com/adobe/helix-pipeline/issues/267)


### BREAKING CHANGES

* **changelog:** not breaking any functionality, bumping to version 2.0 as the v1.* name space for
git tags has already been polluted

# Why 2.0?

Before switching to semantic-release we created a number of GitHub tags with `v1.*.*`, which are now interfering with the semantic release process. Hence 2.0.0 is a purely cosmetic release that does not have any actual breaking changes.

# [1.1.0](https://github.com/adobe/helix-cli/compare/v1.0.0...v1.1.0) (2019-04-29)


### Bug Fixes

* **package:** update @adobe/helix-shared to version 0.10.5 ([8efda26](https://github.com/adobe/helix-cli/commit/8efda26))
* **static:** normalize URLs in rewritten CSS and JS ([25964ba](https://github.com/adobe/helix-cli/commit/25964ba))
* **static:** turn on ESI processing when ESI flag is set ([8b2436b](https://github.com/adobe/helix-cli/commit/8b2436b))


### Features

* **static:** add ESI aliasing support for JavaScript modules ([1fa564d](https://github.com/adobe/helix-cli/commit/1fa564d)), closes [/github.com/adobe/helix-pipeline/issues/224#issuecomment-476690621](https://github.com//github.com/adobe/helix-pipeline/issues/224/issues/issuecomment-476690621)
* **static:** Rewrite CSS URLs to Static ESI URLs so that better caching can be achieved ([396c55b](https://github.com/adobe/helix-cli/commit/396c55b)), closes [adobe/helix-publish#61](https://github.com/adobe/helix-publish/issues/61) [adobe/helix-pipeline#267](https://github.com/adobe/helix-pipeline/issues/267)

# [1.1.0](https://github.com/adobe/helix-cli/compare/v1.0.0...v1.1.0) (2019-04-29)


### Bug Fixes

* **static:** normalize URLs in rewritten CSS and JS ([25964ba](https://github.com/adobe/helix-cli/commit/25964ba))
* **static:** turn on ESI processing when ESI flag is set ([8b2436b](https://github.com/adobe/helix-cli/commit/8b2436b))


### Features

* **static:** add ESI aliasing support for JavaScript modules ([1fa564d](https://github.com/adobe/helix-cli/commit/1fa564d)), closes [/github.com/adobe/helix-pipeline/issues/224#issuecomment-476690621](https://github.com//github.com/adobe/helix-pipeline/issues/224/issues/issuecomment-476690621)
* **static:** Rewrite CSS URLs to Static ESI URLs so that better caching can be achieved ([396c55b](https://github.com/adobe/helix-cli/commit/396c55b)), closes [adobe/helix-publish#61](https://github.com/adobe/helix-publish/issues/61) [adobe/helix-pipeline#267](https://github.com/adobe/helix-pipeline/issues/267)

# [1.0.0](https://github.com/adobe/helix-cli/compare/v0.15.1...v1.0.0) (2019-04-29)


### Bug Fixes

* **package:** update snyk to version 1.154.0 ([401d122](https://github.com/adobe/helix-cli/commit/401d122))


### Features

* **publish:** remove local publish capability ([16354a9](https://github.com/adobe/helix-cli/commit/16354a9)), closes [#795](https://github.com/adobe/helix-cli/issues/795)


### BREAKING CHANGES

* **publish:** The local publish capability is removed and hlx publish completely relies on the
helix-publish service. the use of the --remote argument in hlx publish will now report an error.

## [0.15.1](https://github.com/adobe/helix-cli/compare/v0.15.0...v0.15.1) (2019-04-25)


### Bug Fixes

* **package:** update @adobe/helix-shared to version 0.10.4 ([cb0af47](https://github.com/adobe/helix-cli/commit/cb0af47))

# [0.15.0](https://github.com/adobe/helix-cli/compare/v0.14.18...v0.15.0) (2019-04-24)


### Features

* **publish:** add --update-bot option ([4be9093](https://github.com/adobe/helix-cli/commit/4be9093))

## [0.14.18](https://github.com/adobe/helix-cli/compare/v0.14.17...v0.14.18) (2019-04-21)


### Bug Fixes

* **package:** update @adobe/helix-simulator to version 2.12.3 ([6fd9695](https://github.com/adobe/helix-cli/commit/6fd9695))
* **package:** update snyk to version 1.151.2 ([cedc6e1](https://github.com/adobe/helix-cli/commit/cedc6e1))

## [0.14.17](https://github.com/adobe/helix-cli/compare/v0.14.16...v0.14.17) (2019-04-19)


### Bug Fixes

* package.json & package-lock.json to reduce vulnerabilities ([#786](https://github.com/adobe/helix-cli/issues/786)) ([40056f0](https://github.com/adobe/helix-cli/commit/40056f0))

## [0.14.16](https://github.com/adobe/helix-cli/compare/v0.14.15...v0.14.16) (2019-04-18)


### Bug Fixes

* **package:** update mime-types to version 2.1.23 ([36ec5f7](https://github.com/adobe/helix-cli/commit/36ec5f7))

## [0.14.15](https://github.com/adobe/helix-cli/compare/v0.14.14...v0.14.15) (2019-04-17)


### Bug Fixes

* **GitUtils:** GitUtils.isDirty: ignore git submodules ([fcdc572](https://github.com/adobe/helix-cli/commit/fcdc572)), closes [#614](https://github.com/adobe/helix-cli/issues/614)

## [0.14.14](https://github.com/adobe/helix-cli/compare/v0.14.13...v0.14.14) (2019-04-17)


### Bug Fixes

* **package:** update snyk to version 1.151.1 ([e2df83e](https://github.com/adobe/helix-cli/commit/e2df83e))

## [0.14.13](https://github.com/adobe/helix-cli/compare/v0.14.12...v0.14.13) (2019-04-16)


### Bug Fixes

* **package:** update @snyk/nodejs-runtime-agent to version 1.43.0 ([4a9615a](https://github.com/adobe/helix-cli/commit/4a9615a))

## [0.14.12](https://github.com/adobe/helix-cli/compare/v0.14.11...v0.14.12) (2019-04-12)


### Bug Fixes

* **release:** use adobe-bot for releases ([003e34f](https://github.com/adobe/helix-cli/commit/003e34f))

## [0.14.11](https://github.com/adobe/helix-cli/compare/v0.14.10...v0.14.11) (2019-04-12)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 1.3.5 ([d089888](https://github.com/adobe/helix-cli/commit/d089888))

## [0.14.10](https://github.com/adobe/helix-cli/compare/v0.14.9...v0.14.10) (2019-04-12)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 1.3.4 ([401f365](https://github.com/adobe/helix-cli/commit/401f365))

## [0.14.9](https://github.com/adobe/helix-cli/compare/v0.14.8...v0.14.9) (2019-04-12)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 1.3.3 ([75c8974](https://github.com/adobe/helix-cli/commit/75c8974))

## [0.14.8](https://github.com/adobe/helix-cli/compare/v0.14.7...v0.14.8) (2019-04-12)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 1.3.2 ([a51c802](https://github.com/adobe/helix-cli/commit/a51c802))

## [0.14.7](https://github.com/adobe/helix-cli/compare/v0.14.6...v0.14.7) (2019-04-12)


### Bug Fixes

* **cli:** setting --log-level and --log-file  ([80c57b1](https://github.com/adobe/helix-cli/commit/80c57b1)), closes [#756](https://github.com/adobe/helix-cli/issues/756)

## [0.14.6](https://github.com/adobe/helix-cli/compare/v0.14.5...v0.14.6) (2019-04-11)


### Bug Fixes

* **parcel-plugin-htl dependency:** bumped parcel-plugin-htl dependency since `hlx up` throws a Refer ([290730e](https://github.com/adobe/helix-cli/commit/290730e))

## [0.14.5](https://github.com/adobe/helix-cli/compare/v0.14.4...v0.14.5) (2019-04-11)


### Bug Fixes

* **package:** update @adobe/helix-simulator to version 2.12.0 ([d3f5f62](https://github.com/adobe/helix-cli/commit/d3f5f62))

## [0.14.4](https://github.com/adobe/helix-cli/compare/v0.14.3...v0.14.4) (2019-04-11)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 1.3.1 ([b90952f](https://github.com/adobe/helix-cli/commit/b90952f))
* **package:** update @adobe/helix-shared to version 0.10.3 ([ebff40e](https://github.com/adobe/helix-cli/commit/ebff40e))
* **package:** update @adobe/helix-simulator to version 2.11.3 ([0bf032f](https://github.com/adobe/helix-cli/commit/0bf032f))

## [0.14.3](https://github.com/adobe/helix-cli/compare/v0.14.2...v0.14.3) (2019-04-10)


### Bug Fixes

* **package:** Update @adobe/helix-pipeline to the latest version 🚀 ([#749](https://github.com/adobe/helix-cli/issues/749)) ([ff67230](https://github.com/adobe/helix-cli/commit/ff67230))

## [0.14.2](https://github.com/adobe/helix-cli/compare/v0.14.1...v0.14.2) (2019-04-10)


### Bug Fixes

* **up:** improve local content repository development ([410b3c5](https://github.com/adobe/helix-cli/commit/410b3c5)), closes [#714](https://github.com/adobe/helix-cli/issues/714)

## [0.14.1](https://github.com/adobe/helix-cli/compare/v0.14.0...v0.14.1) (2019-04-10)


### Bug Fixes

* **deploy:** use latest helix-shared that enforces a defaut for 'ref' in string urls ([#746](https://github.com/adobe/helix-cli/issues/746)) ([bef11ed](https://github.com/adobe/helix-cli/commit/bef11ed)), closes [#741](https://github.com/adobe/helix-cli/issues/741)

# [0.14.0](https://github.com/adobe/helix-cli/compare/v0.13.14...v0.14.0) (2019-04-10)


### Bug Fixes

* **package:** remove extra modules from static.zip ([7958b47](https://github.com/adobe/helix-cli/commit/7958b47)), closes [#730](https://github.com/adobe/helix-cli/issues/730)
* package.json & package-lock.json to reduce vulnerabilities ([#740](https://github.com/adobe/helix-cli/issues/740)) ([c9f509c](https://github.com/adobe/helix-cli/commit/c9f509c))
* **release:** use semantic release ([4e2d1a1](https://github.com/adobe/helix-cli/commit/4e2d1a1)), closes [#706](https://github.com/adobe/helix-cli/issues/706)


### Features

* **env:** better developer support through env variables ([8f82f00](https://github.com/adobe/helix-cli/commit/8f82f00)), closes [#14](https://github.com/adobe/helix-cli/issues/14)
