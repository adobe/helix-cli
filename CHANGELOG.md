## [5.2.1](https://github.com/adobe/helix-cli/compare/v5.2.0...v5.2.1) (2019-09-16)


### Bug Fixes

* **deps:** update any ([2efd21b](https://github.com/adobe/helix-cli/commit/2efd21b))

# [5.2.0](https://github.com/adobe/helix-cli/compare/v5.1.0...v5.2.0) (2019-09-12)


### Features

* **up:** hlx up defaults to local repo ([#1149](https://github.com/adobe/helix-cli/issues/1149)) ([62affcb](https://github.com/adobe/helix-cli/commit/62affcb))

# [5.1.0](https://github.com/adobe/helix-cli/compare/v5.0.2...v5.1.0) (2019-09-11)


### Bug Fixes

* **publish:** make withPurge return this ([710d4a9](https://github.com/adobe/helix-cli/commit/710d4a9))
* **publish:** only skip purging when asked explicitly ([ee3603e](https://github.com/adobe/helix-cli/commit/ee3603e))


### Features

* **publish:** enable a choice between soft (new default) and hard purges ([b9aecd3](https://github.com/adobe/helix-cli/commit/b9aecd3))

## [5.0.2](https://github.com/adobe/helix-cli/compare/v5.0.1...v5.0.2) (2019-09-04)


### Bug Fixes

* **cli:** fixes Fastly Error from empty string passing ([#1137](https://github.com/adobe/helix-cli/issues/1137)) ([3c34c41](https://github.com/adobe/helix-cli/commit/3c34c41)), closes [#1135](https://github.com/adobe/helix-cli/issues/1135)

## [5.0.1](https://github.com/adobe/helix-cli/compare/v5.0.0...v5.0.1) (2019-08-27)


### Bug Fixes

* **deps:** update any ([c14e19d](https://github.com/adobe/helix-cli/commit/c14e19d))

# [5.0.0](https://github.com/adobe/helix-cli/compare/v4.10.0...v5.0.0) (2019-08-26)


### Bug Fixes

* **deps:** update any ([#1133](https://github.com/adobe/helix-cli/issues/1133)) ([4fc44d0](https://github.com/adobe/helix-cli/commit/4fc44d0))


### BREAKING CHANGES

* **deps:** helix-pipeline API change in 5.0.0, see https://github.com/adobe/helix-pipeline/releases/tag/v5.0.0

# [4.10.0](https://github.com/adobe/helix-cli/compare/v4.9.14...v4.10.0) (2019-08-21)


### Features

* **parcel:** support replacing steps in pipeline ([#1125](https://github.com/adobe/helix-cli/issues/1125)) ([0fea61c](https://github.com/adobe/helix-cli/commit/0fea61c))

## [4.9.14](https://github.com/adobe/helix-cli/compare/v4.9.13...v4.9.14) (2019-08-20)


### Bug Fixes

* **publish:** fix publish failure for unpublished service configs ([b185bda](https://github.com/adobe/helix-cli/commit/b185bda)), closes [#1127](https://github.com/adobe/helix-cli/issues/1127)

## [4.9.13](https://github.com/adobe/helix-cli/compare/v4.9.12...v4.9.13) (2019-08-16)


### Bug Fixes

* **htl:** use latest htlengine and update other deps ([#1121](https://github.com/adobe/helix-cli/issues/1121)) ([a1882d0](https://github.com/adobe/helix-cli/commit/a1882d0))

## [4.9.12](https://github.com/adobe/helix-cli/compare/v4.9.11...v4.9.12) (2019-08-15)


### Bug Fixes

* **package:** force release ([159cc63](https://github.com/adobe/helix-cli/commit/159cc63))

## [4.9.11](https://github.com/adobe/helix-cli/compare/v4.9.10...v4.9.11) (2019-08-08)


### Bug Fixes

* **deps:** update any ([998500f](https://github.com/adobe/helix-cli/commit/998500f))

## [4.9.10](https://github.com/adobe/helix-cli/compare/v4.9.9...v4.9.10) (2019-07-29)


### Bug Fixes

* **auth:** fix hanging auth tests on windows ([b6ae193](https://github.com/adobe/helix-cli/commit/b6ae193))
* **windows:** ensure that cgi-bin is detected ([836dfeb](https://github.com/adobe/helix-cli/commit/836dfeb))

## [4.9.9](https://github.com/adobe/helix-cli/compare/v4.9.8...v4.9.9) (2019-07-24)


### Bug Fixes

* **package:** update @adobe/helix-simulator to version 2.12.18 ([6eef6a6](https://github.com/adobe/helix-cli/commit/6eef6a6))

## [4.9.8](https://github.com/adobe/helix-cli/compare/v4.9.7...v4.9.8) (2019-07-18)


### Bug Fixes

* **cli:** positional file arguments for deploy and publish not respected ([#1091](https://github.com/adobe/helix-cli/issues/1091)) ([e139db5](https://github.com/adobe/helix-cli/commit/e139db5)), closes [#1090](https://github.com/adobe/helix-cli/issues/1090)

## [4.9.7](https://github.com/adobe/helix-cli/compare/v4.9.6...v4.9.7) (2019-07-18)


### Bug Fixes

* **package:** update dependencies ([653baed](https://github.com/adobe/helix-cli/commit/653baed)), closes [#1086](https://github.com/adobe/helix-cli/issues/1086)

## [4.9.6](https://github.com/adobe/helix-cli/compare/v4.9.5...v4.9.6) (2019-07-17)


### Bug Fixes

* **package:** update @adobe/helix-simulator to version 2.12.17 ([4131317](https://github.com/adobe/helix-cli/commit/4131317))

## [4.9.5](https://github.com/adobe/helix-cli/compare/v4.9.4...v4.9.5) (2019-07-16)


### Bug Fixes

* **package:** get rid of ExperimentalWarning ([#1085](https://github.com/adobe/helix-cli/issues/1085)) ([bdae405](https://github.com/adobe/helix-cli/commit/bdae405)), closes [#1053](https://github.com/adobe/helix-cli/issues/1053)

## [4.9.4](https://github.com/adobe/helix-cli/compare/v4.9.3...v4.9.4) (2019-07-16)


### Bug Fixes

* **package:** update @adobe/helix-shared to version 2.0.0 ([c67ca01](https://github.com/adobe/helix-cli/commit/c67ca01))

## [4.9.3](https://github.com/adobe/helix-cli/compare/v4.9.2...v4.9.3) (2019-07-16)


### Bug Fixes

* **package:** update @adobe/helix-simulator to version 2.12.15 ([49ea31b](https://github.com/adobe/helix-cli/commit/49ea31b))
* **tests:** use correct polly intercept to avoid warning ([#1083](https://github.com/adobe/helix-cli/issues/1083)) ([17669eb](https://github.com/adobe/helix-cli/commit/17669eb)), closes [#1082](https://github.com/adobe/helix-cli/issues/1082)

## [4.9.2](https://github.com/adobe/helix-cli/compare/v4.9.1...v4.9.2) (2019-07-12)


### Bug Fixes

* **package:** update dependencies to address securiry issues ([#1080](https://github.com/adobe/helix-cli/issues/1080)) ([2823e42](https://github.com/adobe/helix-cli/commit/2823e42))

## [4.9.1](https://github.com/adobe/helix-cli/compare/v4.9.0...v4.9.1) (2019-07-09)


### Bug Fixes

* **package:** update webpack to version 4.35.3 ([e857db9](https://github.com/adobe/helix-cli/commit/e857db9))

# [4.9.0](https://github.com/adobe/helix-cli/compare/v4.8.1...v4.9.0) (2019-07-08)


### Features

* **deploy:** must run hlx build ([#241](https://github.com/adobe/helix-cli/issues/241)) ([3981455](https://github.com/adobe/helix-cli/commit/3981455))

## [4.8.1](https://github.com/adobe/helix-cli/compare/v4.8.0...v4.8.1) (2019-07-04)


### Bug Fixes

* **dispatch:** dispatchVersion never sent to the publish action ([#1061](https://github.com/adobe/helix-cli/issues/1061)) ([ddbf0cb](https://github.com/adobe/helix-cli/commit/ddbf0cb))
* **dispatch:** use the dispatchVersion argument ([9e6dad5](https://github.com/adobe/helix-cli/commit/9e6dad5))

# [4.8.0](https://github.com/adobe/helix-cli/compare/v4.7.0...v4.8.0) (2019-07-04)


### Features

* **static:** remove local static action ([a5f6899](https://github.com/adobe/helix-cli/commit/a5f6899)), closes [#1048](https://github.com/adobe/helix-cli/issues/1048)

# [4.7.0](https://github.com/adobe/helix-cli/compare/v4.6.7...v4.7.0) (2019-07-04)


### Features

* **dispatch:** allow custom dispatch version ([#1057](https://github.com/adobe/helix-cli/issues/1057)) ([c5fbc1e](https://github.com/adobe/helix-cli/commit/c5fbc1e))

## [4.6.7](https://github.com/adobe/helix-cli/compare/v4.6.6...v4.6.7) (2019-07-02)


### Bug Fixes

* **deploy:** ensure that static action version is valid ([#1051](https://github.com/adobe/helix-cli/issues/1051)) ([7d55da6](https://github.com/adobe/helix-cli/commit/7d55da6)), closes [#1050](https://github.com/adobe/helix-cli/issues/1050)

## [4.6.6](https://github.com/adobe/helix-cli/compare/v4.6.5...v4.6.6) (2019-07-01)


### Bug Fixes

* **perf:** use versioned performance service ([#1034](https://github.com/adobe/helix-cli/issues/1034)) ([aaee9e2](https://github.com/adobe/helix-cli/commit/aaee9e2))
* **publish:** use versioned logging service ([#1033](https://github.com/adobe/helix-cli/issues/1033)) ([4dddce6](https://github.com/adobe/helix-cli/commit/4dddce6))

## [4.6.5](https://github.com/adobe/helix-cli/compare/v4.6.4...v4.6.5) (2019-06-28)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 3.7.3 ([2e9214b](https://github.com/adobe/helix-cli/commit/2e9214b))

## [4.6.4](https://github.com/adobe/helix-cli/compare/v4.6.3...v4.6.4) (2019-06-28)


### Bug Fixes

* **package:** update snyk to version 1.185.5 ([b9d3505](https://github.com/adobe/helix-cli/commit/b9d3505))

## [4.6.3](https://github.com/adobe/helix-cli/compare/v4.6.2...v4.6.3) (2019-06-27)


### Bug Fixes

* **package:** update snyk to version 1.185.2 ([45aae7a](https://github.com/adobe/helix-cli/commit/45aae7a))

## [4.6.2](https://github.com/adobe/helix-cli/compare/v4.6.1...v4.6.2) (2019-06-27)


### Bug Fixes

* **package:** update snyk to version 1.185.1 ([6e13b70](https://github.com/adobe/helix-cli/commit/6e13b70)), closes [#1028](https://github.com/adobe/helix-cli/issues/1028)

## [4.6.1](https://github.com/adobe/helix-cli/compare/v4.6.0...v4.6.1) (2019-06-26)


### Bug Fixes

* **publish:** use helix-publish@v2 with new dispatch flow ([a80daf1](https://github.com/adobe/helix-cli/commit/a80daf1))

# [4.6.0](https://github.com/adobe/helix-cli/compare/v4.5.0...v4.6.0) (2019-06-26)


### Features

* **publish:** use versioned publish API ([5080a9d](https://github.com/adobe/helix-cli/commit/5080a9d))

# [4.5.0](https://github.com/adobe/helix-cli/compare/v4.4.7...v4.5.0) (2019-06-24)


### Features

* **deploy:** Add API_RESOLVE_GIT_REF as action param ([8ffe164](https://github.com/adobe/helix-cli/commit/8ffe164)), closes [#1007](https://github.com/adobe/helix-cli/issues/1007)

## [4.4.7](https://github.com/adobe/helix-cli/compare/v4.4.6...v4.4.7) (2019-06-21)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 3.7.1 ([952dd20](https://github.com/adobe/helix-cli/commit/952dd20))

## [4.4.6](https://github.com/adobe/helix-cli/compare/v4.4.5...v4.4.6) (2019-06-21)


### Bug Fixes

* **package:** update snyk to version 1.180.0 ([57856af](https://github.com/adobe/helix-cli/commit/57856af))

## [4.4.5](https://github.com/adobe/helix-cli/compare/v4.4.4...v4.4.5) (2019-06-21)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 3.7.0 ([875ca8c](https://github.com/adobe/helix-cli/commit/875ca8c))

## [4.4.4](https://github.com/adobe/helix-cli/compare/v4.4.3...v4.4.4) (2019-06-20)


### Bug Fixes

* **package:** update @adobe/helix-simulator to version 2.12.13 ([35750a3](https://github.com/adobe/helix-cli/commit/35750a3))

## [4.4.3](https://github.com/adobe/helix-cli/compare/v4.4.2...v4.4.3) (2019-06-20)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 3.6.0 ([0709f9e](https://github.com/adobe/helix-cli/commit/0709f9e))

## [4.4.2](https://github.com/adobe/helix-cli/compare/v4.4.1...v4.4.2) (2019-06-18)


### Bug Fixes

* **package:** reduce output during package ([#1001](https://github.com/adobe/helix-cli/issues/1001)) ([811470b](https://github.com/adobe/helix-cli/commit/811470b))

## [4.4.1](https://github.com/adobe/helix-cli/compare/v4.4.0...v4.4.1) (2019-06-17)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 3.5.0 ([64e432f](https://github.com/adobe/helix-cli/commit/64e432f))

# [4.4.0](https://github.com/adobe/helix-cli/compare/v4.3.2...v4.4.0) (2019-06-17)


### Features

* **package:** Make bundle minification configurable ([037e90a](https://github.com/adobe/helix-cli/commit/037e90a)), closes [#998](https://github.com/adobe/helix-cli/issues/998) [#997](https://github.com/adobe/helix-cli/issues/997)

## [4.3.2](https://github.com/adobe/helix-cli/compare/v4.3.1...v4.3.2) (2019-06-13)


### Bug Fixes

* **package:** use latest htlengine 3.2.0 ([f14a958](https://github.com/adobe/helix-cli/commit/f14a958))

## [4.3.1](https://github.com/adobe/helix-cli/compare/v4.3.0...v4.3.1) (2019-06-13)


### Bug Fixes

* **package:** remove unused dependencies ([bc13466](https://github.com/adobe/helix-cli/commit/bc13466))
* **packager:** implement better way to bundle actions ([c2adb80](https://github.com/adobe/helix-cli/commit/c2adb80)), closes [#966](https://github.com/adobe/helix-cli/issues/966) [#672](https://github.com/adobe/helix-cli/issues/672) [#589](https://github.com/adobe/helix-cli/issues/589)

# [4.3.0](https://github.com/adobe/helix-cli/compare/v4.2.10...v4.3.0) (2019-06-12)


### Features

* **cli:** remove --minify and --cache ([b598041](https://github.com/adobe/helix-cli/commit/b598041)), closes [#986](https://github.com/adobe/helix-cli/issues/986)

## [4.2.10](https://github.com/adobe/helix-cli/compare/v4.2.9...v4.2.10) (2019-06-12)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 3.4.0 ([cde435a](https://github.com/adobe/helix-cli/commit/cde435a))

## [4.2.9](https://github.com/adobe/helix-cli/compare/v4.2.8...v4.2.9) (2019-06-12)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 3.3.0 ([0f2da03](https://github.com/adobe/helix-cli/commit/0f2da03))

## [4.2.8](https://github.com/adobe/helix-cli/compare/v4.2.7...v4.2.8) (2019-06-11)


### Bug Fixes

* **package:** update snyk to version 1.175.1 ([7b14012](https://github.com/adobe/helix-cli/commit/7b14012)), closes [#979](https://github.com/adobe/helix-cli/issues/979)

## [4.2.7](https://github.com/adobe/helix-cli/compare/v4.2.6...v4.2.7) (2019-06-11)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 3.2.2 ([85e74bf](https://github.com/adobe/helix-cli/commit/85e74bf))
* **pages:** install helix-pages dependencies and add to module path ([782eace](https://github.com/adobe/helix-cli/commit/782eace)), closes [#967](https://github.com/adobe/helix-cli/issues/967)

## [4.2.6](https://github.com/adobe/helix-cli/compare/v4.2.5...v4.2.6) (2019-06-11)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 3.2.1 ([8f99cb5](https://github.com/adobe/helix-cli/commit/8f99cb5))

## [4.2.5](https://github.com/adobe/helix-cli/compare/v4.2.4...v4.2.5) (2019-06-11)


### Bug Fixes

* **package:** revert: add more modules to packager ([3242aab](https://github.com/adobe/helix-cli/commit/3242aab))

## [4.2.4](https://github.com/adobe/helix-cli/compare/v4.2.3...v4.2.4) (2019-06-10)


### Bug Fixes

* **package:** add more modules to packager ([#974](https://github.com/adobe/helix-cli/issues/974)) ([33d64bc](https://github.com/adobe/helix-cli/commit/33d64bc)), closes [#966](https://github.com/adobe/helix-cli/issues/966)

## [4.2.3](https://github.com/adobe/helix-cli/compare/v4.2.2...v4.2.3) (2019-06-07)


### Bug Fixes

* **package:** update snyk to version 1.174.0 ([e8dcb3e](https://github.com/adobe/helix-cli/commit/e8dcb3e))

## [4.2.2](https://github.com/adobe/helix-cli/compare/v4.2.1...v4.2.2) (2019-06-07)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 3.2.0 ([f6ddda6](https://github.com/adobe/helix-cli/commit/f6ddda6))

## [4.2.1](https://github.com/adobe/helix-cli/compare/v4.2.0...v4.2.1) (2019-06-07)


### Bug Fixes

* **package:** update @adobe/helix-pipeline to version 3.1.0 ([5b72769](https://github.com/adobe/helix-cli/commit/5b72769))

# [4.2.0](https://github.com/adobe/helix-cli/compare/v4.1.0...v4.2.0) (2019-06-06)


### Features

* **pipeline:** use new pipeline and htlengine for full jsdom support ([187287d](https://github.com/adobe/helix-cli/commit/187287d)), closes [#954](https://github.com/adobe/helix-cli/issues/954)

# [4.1.0](https://github.com/adobe/helix-cli/compare/v4.0.9...v4.1.0) (2019-06-06)


### Features

* **up:** checkout and use helix-pages if no source scripts are present ([#946](https://github.com/adobe/helix-cli/issues/946)) ([066e90b](https://github.com/adobe/helix-cli/commit/066e90b)), closes [#929](https://github.com/adobe/helix-cli/issues/929)

## [4.0.9](https://github.com/adobe/helix-cli/compare/v4.0.8...v4.0.9) (2019-06-05)


### Bug Fixes

* **package:** update @adobe/helix-shared to version 1.4.0 ([1c2c155](https://github.com/adobe/helix-cli/commit/1c2c155))
* **package:** update postcss-value-parser to version 4.0.0 ([55723c1](https://github.com/adobe/helix-cli/commit/55723c1))

## [4.0.8](https://github.com/adobe/helix-cli/compare/v4.0.7...v4.0.8) (2019-06-05)


### Bug Fixes

* **package:** update @adobe/helix-simulator to version 2.12.12 ([9223d49](https://github.com/adobe/helix-cli/commit/9223d49))

## [4.0.7](https://github.com/adobe/helix-cli/compare/v4.0.6...v4.0.7) (2019-06-05)


### Bug Fixes

* **package:** update @adobe/parcel-plugin-htl to version 2.1.11 ([6a1254b](https://github.com/adobe/helix-cli/commit/6a1254b))

## [4.0.6](https://github.com/adobe/helix-cli/compare/v4.0.5...v4.0.6) (2019-05-31)


### Bug Fixes

* **package:** add hyperscript as dependency ([#940](https://github.com/adobe/helix-cli/issues/940)) ([f1e35b9](https://github.com/adobe/helix-cli/commit/f1e35b9)), closes [#939](https://github.com/adobe/helix-cli/issues/939)

## [4.0.5](https://github.com/adobe/helix-cli/compare/v4.0.4...v4.0.5) (2019-05-28)


### Bug Fixes

* **package:** dependencies are not correctly bundled ([#932](https://github.com/adobe/helix-cli/issues/932)) ([fe59e10](https://github.com/adobe/helix-cli/commit/fe59e10)), closes [#931](https://github.com/adobe/helix-cli/issues/931)

## [4.0.4](https://github.com/adobe/helix-cli/compare/v4.0.3...v4.0.4) (2019-05-27)


### Bug Fixes

* **package:** update @adobe/helix-simulator to version 2.12.11 ([8fff3ff](https://github.com/adobe/helix-cli/commit/8fff3ff))

## [4.0.3](https://github.com/adobe/helix-cli/compare/v4.0.2...v4.0.3) (2019-05-27)


### Bug Fixes

* **package:** update @adobe/helix-shared to version 1.3.2 ([24bed8a](https://github.com/adobe/helix-cli/commit/24bed8a))

## [4.0.2](https://github.com/adobe/helix-cli/compare/v4.0.1...v4.0.2) (2019-05-27)


### Bug Fixes

* **package:** ensure file packaged properly on windows ([b34f958](https://github.com/adobe/helix-cli/commit/b34f958))
* **package:** ensure no endless loop in windows ([f7387ca](https://github.com/adobe/helix-cli/commit/f7387ca))

## [4.0.1](https://github.com/adobe/helix-cli/compare/v4.0.0...v4.0.1) (2019-05-27)


### Bug Fixes

* **package:** update @adobe/helix-simulator to version 2.12.10 ([fa6aa6c](https://github.com/adobe/helix-cli/commit/fa6aa6c))

# [4.0.0](https://github.com/adobe/helix-cli/compare/v3.2.2...v4.0.0) (2019-05-27)


### Bug Fixes

* **package:** update @adobe/parcel-plugin-htl to version 2.1.10 ([d0b1f3a](https://github.com/adobe/helix-cli/commit/d0b1f3a))


### BREAKING CHANGES

* **package:** due to XSS fixes in the htlengine, injecting the DOM now needs `@ context='unsafe'`.
                 otherwise src and href attrbitues are removed.

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
