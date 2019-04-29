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
