## [13.0.9](https://github.com/adobe/helix-cli/compare/v13.0.8...v13.0.9) (2020-11-09)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.1.3 ([#1558](https://github.com/adobe/helix-cli/issues/1558)) ([f87fe16](https://github.com/adobe/helix-cli/commit/f87fe164a72636f1b6dd0e296d7356779d486e89))

## [13.0.8](https://github.com/adobe/helix-cli/compare/v13.0.7...v13.0.8) (2020-11-03)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) fixes ([c4d7f98](https://github.com/adobe/helix-cli/commit/c4d7f982aed79186510a853ba5552f79879c4139))

## [13.0.7](https://github.com/adobe/helix-cli/compare/v13.0.6...v13.0.7) (2020-11-01)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v6.2.1 ([#1554](https://github.com/adobe/helix-cli/issues/1554)) ([6cdf5f2](https://github.com/adobe/helix-cli/commit/6cdf5f2789a494706ef1f2c55dd8a6dba8b868d6))

## [13.0.6](https://github.com/adobe/helix-cli/compare/v13.0.5...v13.0.6) (2020-10-31)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.1.1 ([10db134](https://github.com/adobe/helix-cli/commit/10db1344d219b79d6067ae7597bae32e15e6bdb0))

## [13.0.5](https://github.com/adobe/helix-cli/compare/v13.0.4...v13.0.5) (2020-10-27)


### Bug Fixes

* **sim:** fix performance issue on certain large repositories ([#1551](https://github.com/adobe/helix-cli/issues/1551)) ([baa3995](https://github.com/adobe/helix-cli/commit/baa39957cdf19c67affc57ddc11a5da192cf5a61))

## [13.0.4](https://github.com/adobe/helix-cli/compare/v13.0.3...v13.0.4) (2020-10-17)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.26 ([dd70c05](https://github.com/adobe/helix-cli/commit/dd70c057f033f1f3446b11243f06346494f977db))

## [13.0.3](https://github.com/adobe/helix-cli/compare/v13.0.2...v13.0.3) (2020-10-12)


### Bug Fixes

* **git-utils:** avoid potential OOME by iterating sequentially over tags ([#1543](https://github.com/adobe/helix-cli/issues/1543)) ([e5abdba](https://github.com/adobe/helix-cli/commit/e5abdbaa91b24cf7b3549365cc8c9eb5586cb882)), closes [#1542](https://github.com/adobe/helix-cli/issues/1542)

## [13.0.2](https://github.com/adobe/helix-cli/compare/v13.0.1...v13.0.2) (2020-10-05)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) fixes ([4f573a8](https://github.com/adobe/helix-cli/commit/4f573a81af53bd59d691e2528be04e715af0a2aa))

## [13.0.1](https://github.com/adobe/helix-cli/compare/v13.0.0...v13.0.1) (2020-10-03)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v7.15.0 ([914f23d](https://github.com/adobe/helix-cli/commit/914f23d12f6647a68589b6082739e67e7edd3f35))
* **deps:** update dependency @adobe/helix-simulator to v5.0.23 ([df57156](https://github.com/adobe/helix-cli/commit/df571564dc1919fd990f65844e71c1184f4e13f4))

# [13.0.0](https://github.com/adobe/helix-cli/compare/v12.1.16...v13.0.0) (2020-09-30)


### Features

* **test:** update tests to use content-proxy v2 ([#1534](https://github.com/adobe/helix-cli/issues/1534)) ([4197cb6](https://github.com/adobe/helix-cli/commit/4197cb63a5b3b083bd35e6dcdca9b5ab7ec62ca0))


### BREAKING CHANGES

* **test:** helix publish v7 uses content-proxy v2 which comes
  with some breaking changes:

- requests to json now returns an object instead of and array [0]
- gdocs2md now has a different table handling [1]
- gdocs2md supports author friendly names [2]

[0] adobe/helix-data-embed@9d1e924
[1] adobe/helix-gdocs2md@e4befdb
[2] adobe/helix-gdocs2md@3aca7b3

## [12.1.16](https://github.com/adobe/helix-cli/compare/v12.1.15...v12.1.16) (2020-09-29)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.22 ([416d811](https://github.com/adobe/helix-cli/commit/416d8115888cf0cc60f044327ab8d9c1154b46d2))

## [12.1.15](https://github.com/adobe/helix-cli/compare/v12.1.14...v12.1.15) (2020-09-29)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) fixes ([71ec625](https://github.com/adobe/helix-cli/commit/71ec6251e21a4e5e664315dcdedee4721a01ad12))

## [12.1.14](https://github.com/adobe/helix-cli/compare/v12.1.13...v12.1.14) (2020-09-26)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.20 ([364a130](https://github.com/adobe/helix-cli/commit/364a130b7faa7069cc5ce649d1b2ad339bc54464))

## [12.1.13](https://github.com/adobe/helix-cli/compare/v12.1.12...v12.1.13) (2020-09-19)


### Bug Fixes

* **deps:** update external fixes ([3be941a](https://github.com/adobe/helix-cli/commit/3be941a4f5167d1f1c869bfe4b29044b4ebd26b6))

## [12.1.12](https://github.com/adobe/helix-cli/compare/v12.1.11...v12.1.12) (2020-09-15)


### Bug Fixes

* **deps:** update dependency yargs to v16 ([#1527](https://github.com/adobe/helix-cli/issues/1527)) ([aa2c433](https://github.com/adobe/helix-cli/commit/aa2c433271b775f9cfb85456552edb3a77f13d2c))

## [12.1.11](https://github.com/adobe/helix-cli/compare/v12.1.10...v12.1.11) (2020-09-11)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.19 ([#1523](https://github.com/adobe/helix-cli/issues/1523)) ([8b8b451](https://github.com/adobe/helix-cli/commit/8b8b45192b0cd229ebc78ad398e0ccbd5c3cca5f))

## [12.1.10](https://github.com/adobe/helix-cli/compare/v12.1.9...v12.1.10) (2020-09-10)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v7.13.0 ([38d038a](https://github.com/adobe/helix-cli/commit/38d038a305afd6ff09744179ec1919c0c7fc57ea))

## [12.1.9](https://github.com/adobe/helix-cli/compare/v12.1.8...v12.1.9) (2020-09-08)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) fixes ([c47acb1](https://github.com/adobe/helix-cli/commit/c47acb1ae9c663dd787596e73dbc7708b2a3e044))

## [12.1.8](https://github.com/adobe/helix-cli/compare/v12.1.7...v12.1.8) (2020-09-02)


### Bug Fixes

* **pages:** use correct branch for pages project ([#1517](https://github.com/adobe/helix-cli/issues/1517)) ([4d179e2](https://github.com/adobe/helix-cli/commit/4d179e282d35441e29811ef655dc173203029d08)), closes [#1516](https://github.com/adobe/helix-cli/issues/1516)

## [12.1.7](https://github.com/adobe/helix-cli/compare/v12.1.6...v12.1.7) (2020-08-26)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.17 ([#1513](https://github.com/adobe/helix-cli/issues/1513)) ([ef055a7](https://github.com/adobe/helix-cli/commit/ef055a723d82eb3b8444e6b54ec4b7162e79255e))

## [12.1.6](https://github.com/adobe/helix-cli/compare/v12.1.5...v12.1.6) (2020-08-26)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v7.11.0 ([91cf634](https://github.com/adobe/helix-cli/commit/91cf6347264d2434121cab4d5dea172e93c5dca0))

## [12.1.5](https://github.com/adobe/helix-cli/compare/v12.1.4...v12.1.5) (2020-08-26)


### Bug Fixes

* **deploy:** ensure default params win over cli arguments ([#1511](https://github.com/adobe/helix-cli/issues/1511)) ([070689e](https://github.com/adobe/helix-cli/commit/070689e8244a5316c4b0c25248e980c6a1a5d427)), closes [#1510](https://github.com/adobe/helix-cli/issues/1510)

## [12.1.4](https://github.com/adobe/helix-cli/compare/v12.1.3...v12.1.4) (2020-08-25)


### Bug Fixes

* **deploy:** remove unused hlx--static ([#1508](https://github.com/adobe/helix-cli/issues/1508)) ([7d78a71](https://github.com/adobe/helix-cli/commit/7d78a714415619c99354fa50c6cd3e86ad7d125f))

## [12.1.3](https://github.com/adobe/helix-cli/compare/v12.1.2...v12.1.3) (2020-08-20)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.16 ([7fcc60a](https://github.com/adobe/helix-cli/commit/7fcc60a8ff7310f6cdb552bfe6fa88082e3a5dc2))

## [12.1.2](https://github.com/adobe/helix-cli/compare/v12.1.1...v12.1.2) (2020-08-20)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v7.10.1 ([55d856b](https://github.com/adobe/helix-cli/commit/55d856b19d2a4426f8b0afa50944abb7129d731e))

## [12.1.1](https://github.com/adobe/helix-cli/compare/v12.1.0...v12.1.1) (2020-08-18)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v6 ([#1500](https://github.com/adobe/helix-cli/issues/1500)) ([e1ec7d5](https://github.com/adobe/helix-cli/commit/e1ec7d5575fb5e270369e63e7bdc487aa980c54a))

# [12.1.0](https://github.com/adobe/helix-cli/compare/v12.0.20...v12.1.0) (2020-08-12)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.15 ([02f3024](https://github.com/adobe/helix-cli/commit/02f3024f50ab6a7f7ff9e8c6e354a39e641203c4))


### Features

* support setting action limits during deploy ([#1503](https://github.com/adobe/helix-cli/issues/1503)) ([540a1e6](https://github.com/adobe/helix-cli/commit/540a1e68f505a8f444b3767f63331de133f1608a)), closes [#1502](https://github.com/adobe/helix-cli/issues/1502)

## [12.0.20](https://github.com/adobe/helix-cli/compare/v12.0.19...v12.0.20) (2020-08-09)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.14 ([#1496](https://github.com/adobe/helix-cli/issues/1496)) ([2a62f1f](https://github.com/adobe/helix-cli/commit/2a62f1f419ac8446a41b32e13fd96c853820228a))

## [12.0.19](https://github.com/adobe/helix-cli/compare/v12.0.18...v12.0.19) (2020-08-03)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.13 ([95c09ff](https://github.com/adobe/helix-cli/commit/95c09fff8a3106b8a80688f8ab1a6dd1203dfdce))

## [12.0.18](https://github.com/adobe/helix-cli/compare/v12.0.17...v12.0.18) (2020-08-02)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v5.1.0 ([658c3f8](https://github.com/adobe/helix-cli/commit/658c3f86957d253abfea9295e2c59fd8f38bcdaf))

## [12.0.17](https://github.com/adobe/helix-cli/compare/v12.0.16...v12.0.17) (2020-07-29)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v5 ([#1491](https://github.com/adobe/helix-cli/issues/1491)) ([e95aec3](https://github.com/adobe/helix-cli/commit/e95aec3a7906156311b2e00bfe07869def11d3ef))

## [12.0.16](https://github.com/adobe/helix-cli/compare/v12.0.15...v12.0.16) (2020-07-28)


### Bug Fixes

* **deps:** update dependency archiver to v5 ([#1489](https://github.com/adobe/helix-cli/issues/1489)) ([e4d7190](https://github.com/adobe/helix-cli/commit/e4d71906dcea3288dbe59a88d0732910046aa5d3))

## [12.0.15](https://github.com/adobe/helix-cli/compare/v12.0.14...v12.0.15) (2020-07-27)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.12 ([cb4cde6](https://github.com/adobe/helix-cli/commit/cb4cde64e69c75c8f3818766a2a9a5356d29a4c6))

## [12.0.14](https://github.com/adobe/helix-cli/compare/v12.0.13...v12.0.14) (2020-07-25)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.11 ([0e6c334](https://github.com/adobe/helix-cli/commit/0e6c334976232a8883b6b961197d8ab4b9e68a55))

## [12.0.13](https://github.com/adobe/helix-cli/compare/v12.0.12...v12.0.13) (2020-07-23)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.10 ([46ccbbb](https://github.com/adobe/helix-cli/commit/46ccbbb254f2047789a224ae0cd5f4bf0d84fea7))

## [12.0.12](https://github.com/adobe/helix-cli/compare/v12.0.11...v12.0.12) (2020-07-22)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.9 ([118bb0f](https://github.com/adobe/helix-cli/commit/118bb0f3922838fbe8093fb00210b341060e50a1))

## [12.0.11](https://github.com/adobe/helix-cli/compare/v12.0.10...v12.0.11) (2020-07-22)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v4.6.2 ([bd5ae53](https://github.com/adobe/helix-cli/commit/bd5ae5304c0196f91374dbdd4feec4ea44c2c579))

## [12.0.10](https://github.com/adobe/helix-cli/compare/v12.0.9...v12.0.10) (2020-07-21)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.8 ([#1482](https://github.com/adobe/helix-cli/issues/1482)) ([61c5777](https://github.com/adobe/helix-cli/commit/61c57776c0175a3420b75c1fceeca5e781aaf8d7))

## [12.0.9](https://github.com/adobe/helix-cli/compare/v12.0.8...v12.0.9) (2020-07-21)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) fixes ([#1481](https://github.com/adobe/helix-cli/issues/1481)) ([0bbfa54](https://github.com/adobe/helix-cli/commit/0bbfa54ead4491f0752f2ff953eb6f3c10d39e9e))

## [12.0.8](https://github.com/adobe/helix-cli/compare/v12.0.7...v12.0.8) (2020-07-20)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.6 ([41211cd](https://github.com/adobe/helix-cli/commit/41211cdc3ae12139866b0d7c7e518e5a44a265c9))

## [12.0.7](https://github.com/adobe/helix-cli/compare/v12.0.6...v12.0.7) (2020-07-20)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.5 ([4110385](https://github.com/adobe/helix-cli/commit/411038552bbaec03792d4e48af967f489ac85e6e))

## [12.0.6](https://github.com/adobe/helix-cli/compare/v12.0.5...v12.0.6) (2020-07-18)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.4 ([49502e5](https://github.com/adobe/helix-cli/commit/49502e544b3851fd17ab5da074aa34bac870a669))

## [12.0.5](https://github.com/adobe/helix-cli/compare/v12.0.4...v12.0.5) (2020-07-16)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) fixes ([#1475](https://github.com/adobe/helix-cli/issues/1475)) ([4055d16](https://github.com/adobe/helix-cli/commit/4055d16df483baf81ce2da3ed4927ecc5ce1b17f))

## [12.0.4](https://github.com/adobe/helix-cli/compare/v12.0.3...v12.0.4) (2020-07-16)


### Bug Fixes

* **deps:** update dependency lodash to v4.17.19 [security] ([6ed7b2d](https://github.com/adobe/helix-cli/commit/6ed7b2de2f5a12846b40700027ccf358dc67fe7d))

## [12.0.3](https://github.com/adobe/helix-cli/compare/v12.0.2...v12.0.3) (2020-07-13)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.2 ([c9d4428](https://github.com/adobe/helix-cli/commit/c9d4428da087ebb1da191cd1b8c42252c32964b7))

## [12.0.2](https://github.com/adobe/helix-cli/compare/v12.0.1...v12.0.2) (2020-07-12)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5.0.1 ([0cb2721](https://github.com/adobe/helix-cli/commit/0cb2721894455ad57c1f1e44ff7bcfb66555bcb9))

## [12.0.1](https://github.com/adobe/helix-cli/compare/v12.0.0...v12.0.1) (2020-07-11)


### Bug Fixes

* **deps:** update dependency isomorphic-git to v1.7.1 ([b3cdcd2](https://github.com/adobe/helix-cli/commit/b3cdcd23f869ad0c56e22fa93908deab662178b0))

# [12.0.0](https://github.com/adobe/helix-cli/compare/v11.0.3...v12.0.0) (2020-07-10)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v5 ([#1469](https://github.com/adobe/helix-cli/issues/1469)) ([70c816c](https://github.com/adobe/helix-cli/commit/70c816c74d4753ec8297db45ec01c70bd40e7abf))


### BREAKING CHANGES

* **deps:** local dev of json and md scripts are not supported as they are routed directly to the content-proxy.

## [11.0.3](https://github.com/adobe/helix-cli/compare/v11.0.2...v11.0.3) (2020-07-10)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.4.1 ([#1468](https://github.com/adobe/helix-cli/issues/1468)) ([92d76ce](https://github.com/adobe/helix-cli/commit/92d76ce4ec61b3519f27cf28825658dcb7fd57a5))

## [11.0.2](https://github.com/adobe/helix-cli/compare/v11.0.1...v11.0.2) (2020-07-09)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.4.0 ([#1466](https://github.com/adobe/helix-cli/issues/1466)) ([8048549](https://github.com/adobe/helix-cli/commit/80485492a25098ff4b91061f6f2391d40cdbd048))

## [11.0.1](https://github.com/adobe/helix-cli/compare/v11.0.0...v11.0.1) (2020-07-07)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v4.6.0 ([dc38a64](https://github.com/adobe/helix-cli/commit/dc38a645d3e51c23ec1375cc3884f2c362b1313d))

# [11.0.0](https://github.com/adobe/helix-cli/compare/v10.4.2...v11.0.0) (2020-07-03)


### Features

* **publish:** use helix-publish@v6 ([0107ffb](https://github.com/adobe/helix-cli/commit/0107ffb15d4e41852077cce6dee1811723da0d52))


### BREAKING CHANGES

* **publish:** helix-publish@v6 and helix-dispatch@v4 change the default directory index. Details here: https://github.com/adobe/helix-dispatch/releases/tag/v4.0.0

## [10.4.2](https://github.com/adobe/helix-cli/compare/v10.4.1...v10.4.2) (2020-07-03)


### Bug Fixes

* **deps:** update dependency isomorphic-git to v1.7.0 ([#1459](https://github.com/adobe/helix-cli/issues/1459)) ([4013561](https://github.com/adobe/helix-cli/commit/4013561537ada6188a349a83a50eaf88b6df0bdc))

## [10.4.1](https://github.com/adobe/helix-cli/compare/v10.4.0...v10.4.1) (2020-07-02)


### Bug Fixes

* **deps:** update dependency yargs to v15.4.0 ([95c212f](https://github.com/adobe/helix-cli/commit/95c212f8a34b4de29aed6adf6797b749d5464c98))

# [10.4.0](https://github.com/adobe/helix-cli/compare/v10.3.12...v10.4.0) (2020-07-02)


### Features

* **request:** request is deprecated; replace with helix-fetch ([b375183](https://github.com/adobe/helix-cli/commit/b375183982c7e50b2f84a2d521e0c6be3a4053eb))

## [10.3.12](https://github.com/adobe/helix-cli/compare/v10.3.11...v10.3.12) (2020-06-30)


### Bug Fixes

* **deps:** update dependency isomorphic-git to v1.6.0 ([#1453](https://github.com/adobe/helix-cli/issues/1453)) ([8e6fa46](https://github.com/adobe/helix-cli/commit/8e6fa46126d9e85ececae24226361f0f3668fc31))

## [10.3.11](https://github.com/adobe/helix-cli/compare/v10.3.10...v10.3.11) (2020-06-30)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v4.5.2 ([8ed23e4](https://github.com/adobe/helix-cli/commit/8ed23e48672880d9c5e439305fbcf8b56ec7a7aa))

## [10.3.10](https://github.com/adobe/helix-cli/compare/v10.3.9...v10.3.10) (2020-06-27)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([236d21a](https://github.com/adobe/helix-cli/commit/236d21a5dcd610c0a3c5c8fba884aeb48be30b95))

## [10.3.9](https://github.com/adobe/helix-cli/compare/v10.3.8...v10.3.9) (2020-06-27)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v4.5.1 ([4fdad15](https://github.com/adobe/helix-cli/commit/4fdad151030b79b4b697a501296952cb4a165c90))

## [10.3.8](https://github.com/adobe/helix-cli/compare/v10.3.7...v10.3.8) (2020-06-26)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.3.4 ([3ca65d1](https://github.com/adobe/helix-cli/commit/3ca65d13bc353ec8d0eb2f62ef1c60b563726947))

## [10.3.7](https://github.com/adobe/helix-cli/compare/v10.3.6...v10.3.7) (2020-06-26)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v7.8.1 ([8351964](https://github.com/adobe/helix-cli/commit/83519648cef93bcca61413f8af6659206b40dd28))

## [10.3.6](https://github.com/adobe/helix-cli/compare/v10.3.5...v10.3.6) (2020-06-26)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.3.3 ([03201fa](https://github.com/adobe/helix-cli/commit/03201fa32a5b3551548833bc1a56eac9eccce142))

## [10.3.5](https://github.com/adobe/helix-cli/compare/v10.3.4...v10.3.5) (2020-06-26)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v7.8.0 ([06903a1](https://github.com/adobe/helix-cli/commit/06903a1df926983dba963f3373e6f15b3995cb5e))

## [10.3.4](https://github.com/adobe/helix-cli/compare/v10.3.3...v10.3.4) (2020-06-25)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([37d2a63](https://github.com/adobe/helix-cli/commit/37d2a63dce1bcb0ebd53ab76089233530d46ffcf))

## [10.3.3](https://github.com/adobe/helix-cli/compare/v10.3.2...v10.3.3) (2020-06-24)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.3.1 ([ac2f828](https://github.com/adobe/helix-cli/commit/ac2f828f8de7a8185bd2714773736ac308cb3ee0))

## [10.3.2](https://github.com/adobe/helix-cli/compare/v10.3.1...v10.3.2) (2020-06-24)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v7.7.0 ([314e14a](https://github.com/adobe/helix-cli/commit/314e14ab1ace030dc6fa08e569a663e29e4c04aa))

## [10.3.1](https://github.com/adobe/helix-cli/compare/v10.3.0...v10.3.1) (2020-06-23)


### Bug Fixes

* **up:** prefer online when installing pipeline ([#1440](https://github.com/adobe/helix-cli/issues/1440)) ([0724bdd](https://github.com/adobe/helix-cli/commit/0724bdd103538bec283644e0bcedadee1efe42c3)), closes [#1435](https://github.com/adobe/helix-cli/issues/1435)

# [10.3.0](https://github.com/adobe/helix-cli/compare/v10.2.8...v10.3.0) (2020-06-23)


### Features

* **up:** add support for live-reload ([#1437](https://github.com/adobe/helix-cli/issues/1437)) ([28798e9](https://github.com/adobe/helix-cli/commit/28798e9191880b69aa4d4232ac9ce953afc44dfd))

## [10.2.8](https://github.com/adobe/helix-cli/compare/v10.2.7...v10.2.8) (2020-06-22)


### Bug Fixes

* **deps:** remove eslint update ([278aa57](https://github.com/adobe/helix-cli/commit/278aa57801f0e9e82d7f6fbbdc850ad18ac0cf5d))

## [10.2.7](https://github.com/adobe/helix-cli/compare/v10.2.6...v10.2.7) (2020-06-17)


### Bug Fixes

* **up:** reload if sources in helix pages checkout are changes ([1a1652b](https://github.com/adobe/helix-cli/commit/1a1652b34812240f74a641a0be861335bda3387a)), closes [#1394](https://github.com/adobe/helix-cli/issues/1394)
* **up:** reload project on git branch switch ([dc2a906](https://github.com/adobe/helix-cli/commit/dc2a906968406f5e97328bb7a813772b860aaec3)), closes [#1389](https://github.com/adobe/helix-cli/issues/1389)

## [10.2.6](https://github.com/adobe/helix-cli/compare/v10.2.5...v10.2.6) (2020-06-16)


### Bug Fixes

* tests ([b7be035](https://github.com/adobe/helix-cli/commit/b7be03593237f40d07561e5b368de4c7ee8de8d1))

## [10.2.5](https://github.com/adobe/helix-cli/compare/v10.2.4...v10.2.5) (2020-06-15)


### Bug Fixes

* **deps:** update external ([c523f4b](https://github.com/adobe/helix-cli/commit/c523f4b876daa9fd50a24c6a19e06a120967b4d7))

## [10.2.4](https://github.com/adobe/helix-cli/compare/v10.2.3...v10.2.4) (2020-06-15)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.1.18 ([#1428](https://github.com/adobe/helix-cli/issues/1428)) ([c4f34fd](https://github.com/adobe/helix-cli/commit/c4f34fd1d121d64849a86cd552d519ed53bbec39))

## [10.2.3](https://github.com/adobe/helix-cli/compare/v10.2.2...v10.2.3) (2020-06-15)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v7.6.0 ([ae3cd50](https://github.com/adobe/helix-cli/commit/ae3cd5051443c9fd5524b73754f99c014f352084))

## [10.2.2](https://github.com/adobe/helix-cli/compare/v10.2.1...v10.2.2) (2020-06-12)


### Bug Fixes

* **tests:** re-record tests for pipeline that uses content-proxy ([#1424](https://github.com/adobe/helix-cli/issues/1424)) ([4b7ee39](https://github.com/adobe/helix-cli/commit/4b7ee395bb8b73905824ecf279ad46ef93955744))

## [10.2.1](https://github.com/adobe/helix-cli/compare/v10.2.0...v10.2.1) (2020-06-08)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([#1420](https://github.com/adobe/helix-cli/issues/1420)) ([fe9eaf2](https://github.com/adobe/helix-cli/commit/fe9eaf2684cfe19a34bc4b6e06c87f78d352bbd0))

# [10.2.0](https://github.com/adobe/helix-cli/compare/v10.1.1...v10.2.0) (2020-06-08)


### Features

* **up:** better support for local directories and --custom-pipeline ([f2c023a](https://github.com/adobe/helix-cli/commit/f2c023a294ce6a80d2ee348bdd7e6f9ec9a8dcbd)), closes [#1415](https://github.com/adobe/helix-cli/issues/1415)

## [10.1.1](https://github.com/adobe/helix-cli/compare/v10.1.0...v10.1.1) (2020-06-04)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.1.16 ([#1417](https://github.com/adobe/helix-cli/issues/1417)) ([79d049a](https://github.com/adobe/helix-cli/commit/79d049a6b5540f19dd3c64262140a68c677b0ffd))
* **revert:** revert accidental change of pipline installation ([c761c4d](https://github.com/adobe/helix-cli/commit/c761c4d862e1c6486d4cbc4698966207c1c22d5a))

# [10.1.0](https://github.com/adobe/helix-cli/compare/v10.0.1...v10.1.0) (2020-06-03)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v7.4.0 ([c54c9b7](https://github.com/adobe/helix-cli/commit/c54c9b74d82d59d58f1818bdc0a93436d11aff26))


### Features

* **deploy:** add deploy time and package version ([#1413](https://github.com/adobe/helix-cli/issues/1413)) ([db807f4](https://github.com/adobe/helix-cli/commit/db807f4432d8b8b549ded342352e89672695f62c)), closes [#1409](https://github.com/adobe/helix-cli/issues/1409)

## [10.0.1](https://github.com/adobe/helix-cli/compare/v10.0.0...v10.0.1) (2020-05-27)


### Bug Fixes

* **deploy:** filter all falsy values from package parameters ([1b99896](https://github.com/adobe/helix-cli/commit/1b99896d29dbd416120ed855b1d787e426a30546)), closes [#1410](https://github.com/adobe/helix-cli/issues/1410)

# [10.0.0](https://github.com/adobe/helix-cli/compare/v9.1.9...v10.0.0) (2020-05-26)


### Bug Fixes

* **deploy:** add missing epsagon application name ([c98d03a](https://github.com/adobe/helix-cli/commit/c98d03ab744b31014cc2389f542de39492f66504))
* **deploy:** remove null values when setting deploy-time parameters ([1a155b8](https://github.com/adobe/helix-cli/commit/1a155b862596dc8f795b20e1c55ef38617d37f5e))


### Code Refactoring

* **loggly:** remove support for Loggy ([5652cb8](https://github.com/adobe/helix-cli/commit/5652cb86d062ac739a444d2ca3e2faf5c9b11f7e))


### Features

* **deploy:** pass epsagon and coralogix credentials to deployed package ([cb0c872](https://github.com/adobe/helix-cli/commit/cb0c872b19017fe6faa2535b8d8bb7d68af41513))
* **epsagon:** pass Epsagon app name and token to helix-publish for VCL tracing ([b5d7107](https://github.com/adobe/helix-cli/commit/b5d710724f8865b60e2943b9cb58328e61cb6369))
* **publish:** add support for coralogix logging at CDN level ([1379819](https://github.com/adobe/helix-cli/commit/1379819e2eb7589a8503f14b3301008bee3308b5)), closes [#1372](https://github.com/adobe/helix-cli/issues/1372)


### BREAKING CHANGES

* **loggly:** The loggly support wasn't in active use for a while (since we switched from Winston to Helix Log), but remnants remained in the helix-cli code base. This commit removes that support entirely.

## [9.1.9](https://github.com/adobe/helix-cli/compare/v9.1.8...v9.1.9) (2020-05-19)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v4.4.1 ([69f8418](https://github.com/adobe/helix-cli/commit/69f8418b4fcb4e3e5d346619704c81df28dd5865))

## [9.1.8](https://github.com/adobe/helix-cli/compare/v9.1.7...v9.1.8) (2020-05-14)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.1.15 ([7bd733a](https://github.com/adobe/helix-cli/commit/7bd733a0a1c993acc413d936d090baed83a7446e))

## [9.1.7](https://github.com/adobe/helix-cli/compare/v9.1.6...v9.1.7) (2020-05-14)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v7.3.2 ([127c8eb](https://github.com/adobe/helix-cli/commit/127c8ebbcd3912640f1f253f50fb7cd2182cff11))

## [9.1.6](https://github.com/adobe/helix-cli/compare/v9.1.5...v9.1.6) (2020-05-07)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([#1396](https://github.com/adobe/helix-cli/issues/1396)) ([df3259a](https://github.com/adobe/helix-cli/commit/df3259a9e75bd6b098904134974e66ce1138bce5))

## [9.1.5](https://github.com/adobe/helix-cli/compare/v9.1.4...v9.1.5) (2020-05-07)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v4.4.0 ([964a31b](https://github.com/adobe/helix-cli/commit/964a31b8308fd9149bfd6968190b19a6d115821b))

## [9.1.4](https://github.com/adobe/helix-cli/compare/v9.1.3...v9.1.4) (2020-04-28)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.1.13 ([4ff88c6](https://github.com/adobe/helix-cli/commit/4ff88c6668dece48adf046446f6d7ac8c8bf8c55))

## [9.1.3](https://github.com/adobe/helix-cli/compare/v9.1.2...v9.1.3) (2020-04-27)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v7.2.1 ([3aa7022](https://github.com/adobe/helix-cli/commit/3aa7022489e70b30f2541c19b8ac0acbd11ffcb7))

## [9.1.2](https://github.com/adobe/helix-cli/compare/v9.1.1...v9.1.2) (2020-04-27)


### Bug Fixes

* **deps:** npm audit fix ([5c861f7](https://github.com/adobe/helix-cli/commit/5c861f7dc62efea0a8087e2f9b2acaf331b57f24))
* **deps:** update [@adobe](https://github.com/adobe) ([39d0a94](https://github.com/adobe/helix-cli/commit/39d0a941406f2a81ba1fe53d8ecb7703898f5434))
* **deps:** update dependency @adobe/helix-shared to v7.2.0 ([bd13a26](https://github.com/adobe/helix-cli/commit/bd13a26e16ce6c181dbe42f10fc4d1e2e19d9e57))
* **deps:** update dependency @adobe/helix-simulator to v4.1.12 ([2dce23c](https://github.com/adobe/helix-cli/commit/2dce23c5758d4f846879ea1c62f072f9fc961da5))
* **publish:** use helix-publish@v5 ([bf0f83e](https://github.com/adobe/helix-cli/commit/bf0f83eb66b9dbe4073224ba896a37d5b85999c3)), closes [#1371](https://github.com/adobe/helix-cli/issues/1371)

## [9.1.1](https://github.com/adobe/helix-cli/compare/v9.1.0...v9.1.1) (2020-04-20)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.1.10 ([2856e47](https://github.com/adobe/helix-cli/commit/2856e4708ff3cbae210dcfeccb2da17178b763f0))
* **deps:** update dependency archiver to v4 ([2cf15e9](https://github.com/adobe/helix-cli/commit/2cf15e947480f5c0b12eabef659124759fef6a55))

# [9.1.0](https://github.com/adobe/helix-cli/compare/v9.0.1...v9.1.0) (2020-04-20)


### Features

* **deploy:** add project info and dependencies as action annotations ([#1369](https://github.com/adobe/helix-cli/issues/1369)) ([541ceb2](https://github.com/adobe/helix-cli/commit/541ceb2d6f08a167f6609fec0408b22baf331d8b)), closes [#1365](https://github.com/adobe/helix-cli/issues/1365)

## [9.0.1](https://github.com/adobe/helix-cli/compare/v9.0.0...v9.0.1) (2020-04-16)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v7 ([#1366](https://github.com/adobe/helix-cli/issues/1366)) ([b224a5b](https://github.com/adobe/helix-cli/commit/b224a5b734d3813d25a1db15d57a1d90fae27c9d))

# [9.0.0](https://github.com/adobe/helix-cli/compare/v8.2.0...v9.0.0) (2020-04-16)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.1.9 ([4f8ffa4](https://github.com/adobe/helix-cli/commit/4f8ffa4699413d2accd518358b24dd8315a7ba97))


### BREAKING CHANGES

* **deps:** url property removed from strain, use condition instead

# [8.2.0](https://github.com/adobe/helix-cli/compare/v8.1.13...v8.2.0) (2020-04-14)


### Features

* **cli:** better default parameter parsing ([#1362](https://github.com/adobe/helix-cli/issues/1362)) ([b1a1f74](https://github.com/adobe/helix-cli/commit/b1a1f74b4e72c2a65fa16283695fbfddd80023f0)), closes [#1352](https://github.com/adobe/helix-cli/issues/1352)

## [8.1.13](https://github.com/adobe/helix-cli/compare/v8.1.12...v8.1.13) (2020-04-13)


### Bug Fixes

* **tests:** ignore x-request-id in pollyjs ([#1360](https://github.com/adobe/helix-cli/issues/1360)) ([dc94c58](https://github.com/adobe/helix-cli/commit/dc94c586658e78b9f0f89d7e9e80797c9dfca19a))

## [8.1.12](https://github.com/adobe/helix-cli/compare/v8.1.11...v8.1.12) (2020-04-10)


### Bug Fixes

* **embed:** fix embed generated link ([#1359](https://github.com/adobe/helix-cli/issues/1359)) ([a2c39ff](https://github.com/adobe/helix-cli/commit/a2c39ff1359ae4d941799d9487ceb32aa32150b6))

## [8.1.11](https://github.com/adobe/helix-cli/compare/v8.1.10...v8.1.11) (2020-04-07)


### Bug Fixes

* **deps:** update dependency chalk to v4 ([#1358](https://github.com/adobe/helix-cli/issues/1358)) ([7ac5270](https://github.com/adobe/helix-cli/commit/7ac527038b658ca3977a7f3b226666b368ef8ce9))

## [8.1.10](https://github.com/adobe/helix-cli/compare/v8.1.9...v8.1.10) (2020-03-24)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.1.7 ([#1349](https://github.com/adobe/helix-cli/issues/1349)) ([4cc3646](https://github.com/adobe/helix-cli/commit/4cc36464df5611a33c49d6f0a58d08df86431f90))

## [8.1.9](https://github.com/adobe/helix-cli/compare/v8.1.8...v8.1.9) (2020-03-24)


### Bug Fixes

* **deps:** update dependency fs-extra to v9 ([#1346](https://github.com/adobe/helix-cli/issues/1346)) ([f789f49](https://github.com/adobe/helix-cli/commit/f789f492f5ea4539a9a6aa9b7efa355d1a234b3b))

## [8.1.8](https://github.com/adobe/helix-cli/compare/v8.1.7...v8.1.8) (2020-03-24)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([#1348](https://github.com/adobe/helix-cli/issues/1348)) ([ca155c5](https://github.com/adobe/helix-cli/commit/ca155c5fa3f768543f320f7ba090411fb8e0c85f))

## [8.1.7](https://github.com/adobe/helix-cli/compare/v8.1.6...v8.1.7) (2020-03-23)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v4.3.1 ([e964259](https://github.com/adobe/helix-cli/commit/e964259c95d0a4d18a20636978653bb10feae7a6))

## [8.1.6](https://github.com/adobe/helix-cli/compare/v8.1.5...v8.1.6) (2020-03-17)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.1.4 ([d0826cd](https://github.com/adobe/helix-cli/commit/d0826cd062b6d52f5349f313df3f7cb5ebe3b2af))

## [8.1.5](https://github.com/adobe/helix-cli/compare/v8.1.4...v8.1.5) (2020-03-17)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v6.0.4 ([befe299](https://github.com/adobe/helix-cli/commit/befe299d77225e481990d8e0057c9c4494270522))

## [8.1.4](https://github.com/adobe/helix-cli/compare/v8.1.3...v8.1.4) (2020-03-17)


### Bug Fixes

* **deps:** update external ([#1340](https://github.com/adobe/helix-cli/issues/1340)) ([4e52e8c](https://github.com/adobe/helix-cli/commit/4e52e8c95caccc1d6abf6ceef03bd0a8a9431ffa))

## [8.1.3](https://github.com/adobe/helix-cli/compare/v8.1.2...v8.1.3) (2020-03-09)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([bcc4f3f](https://github.com/adobe/helix-cli/commit/bcc4f3fcd21317f05e51ac0d59df28f80054f524))

## [8.1.2](https://github.com/adobe/helix-cli/compare/v8.1.1...v8.1.2) (2020-03-09)


### Bug Fixes

* **deps:** update external ([#1336](https://github.com/adobe/helix-cli/issues/1336)) ([92f75b5](https://github.com/adobe/helix-cli/commit/92f75b5cfd8fc0025d09b9fb6d8599afa11adb2d))

## [8.1.1](https://github.com/adobe/helix-cli/compare/v8.1.0...v8.1.1) (2020-03-07)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.1.2 ([#1335](https://github.com/adobe/helix-cli/issues/1335)) ([4ce3d8d](https://github.com/adobe/helix-cli/commit/4ce3d8dd4f688c703b63fbbd96e8eec8a35f5819))

# [8.1.0](https://github.com/adobe/helix-cli/compare/v8.0.2...v8.1.0) (2020-03-07)


### Features

* port to isomorphic-git v1 ([#1334](https://github.com/adobe/helix-cli/issues/1334)) ([ea426f2](https://github.com/adobe/helix-cli/commit/ea426f281169be12f00ece672d339d7a61b377b2)), closes [#1331](https://github.com/adobe/helix-cli/issues/1331)

## [8.0.2](https://github.com/adobe/helix-cli/compare/v8.0.1...v8.0.2) (2020-03-06)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.1.1 ([2f259ba](https://github.com/adobe/helix-cli/commit/2f259ba65da6fe91abe62237819414fd973bef62))

## [8.0.1](https://github.com/adobe/helix-cli/compare/v8.0.0...v8.0.1) (2020-03-06)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.1.0 ([c2634f9](https://github.com/adobe/helix-cli/commit/c2634f9f236467a8f67f555f1dd94585a3dc1179))

# [8.0.0](https://github.com/adobe/helix-cli/compare/v7.5.15...v8.0.0) (2020-03-04)


### Features

* **publish:** full condition support with helix-publish@v4 ([63968f9](https://github.com/adobe/helix-cli/commit/63968f90004e8fd2be1a35f97efd94b7ae9b1ffe)), closes [#1328](https://github.com/adobe/helix-cli/issues/1328)


### BREAKING CHANGES

* **publish:** This change introduces full support for the new YAML-based conditions language. At the same time, VCL-based conditions (strings) can no longer be used.

## [7.5.15](https://github.com/adobe/helix-cli/compare/v7.5.14...v7.5.15) (2020-03-03)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([7c6f7f8](https://github.com/adobe/helix-cli/commit/7c6f7f817e75a17cfecabf178fb2d66db1bfa96c))

## [7.5.14](https://github.com/adobe/helix-cli/compare/v7.5.13...v7.5.14) (2020-03-02)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v4.0.1 ([2cbefda](https://github.com/adobe/helix-cli/commit/2cbefdaa040403ac215aa00ccc2411559f6589a8))

## [7.5.13](https://github.com/adobe/helix-cli/compare/v7.5.12...v7.5.13) (2020-03-02)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([ae32f8e](https://github.com/adobe/helix-cli/commit/ae32f8ef688b9a73903e2ed28739243fd24d91e6))

## [7.5.12](https://github.com/adobe/helix-cli/compare/v7.5.11...v7.5.12) (2020-02-26)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([469c1aa](https://github.com/adobe/helix-cli/commit/469c1aa520952953fd4db88020217973f8c56303))

## [7.5.11](https://github.com/adobe/helix-cli/compare/v7.5.10...v7.5.11) (2020-02-26)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v4.3.0 ([1013006](https://github.com/adobe/helix-cli/commit/101300681621136f929e4a9b0c982c8cac88585c))

## [7.5.10](https://github.com/adobe/helix-cli/compare/v7.5.9...v7.5.10) (2020-02-26)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v4.2.0 ([c3d4f6d](https://github.com/adobe/helix-cli/commit/c3d4f6d9ddc344f8fe7671fcd768a1caa83ad0be))

## [7.5.9](https://github.com/adobe/helix-cli/compare/v7.5.8...v7.5.9) (2020-02-26)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v4.1.1 ([cb027e9](https://github.com/adobe/helix-cli/commit/cb027e954237c7486e01ae833ae7f4945bce50bf))

## [7.5.8](https://github.com/adobe/helix-cli/compare/v7.5.7...v7.5.8) (2020-02-26)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v4.1.0 ([#1317](https://github.com/adobe/helix-cli/issues/1317)) ([d694676](https://github.com/adobe/helix-cli/commit/d694676f15780c179ad76dc974d276e68c98d075))

## [7.5.7](https://github.com/adobe/helix-cli/compare/v7.5.6...v7.5.7) (2020-02-26)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v4.0.3 ([959b254](https://github.com/adobe/helix-cli/commit/959b25452a2111701db9c9b0c22b167254eabf93))

## [7.5.6](https://github.com/adobe/helix-cli/compare/v7.5.5...v7.5.6) (2020-02-26)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v4.0.2 ([711e279](https://github.com/adobe/helix-cli/commit/711e279749b249d257ce269d53308cde00807def))

## [7.5.5](https://github.com/adobe/helix-cli/compare/v7.5.4...v7.5.5) (2020-02-25)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v4.0.1 ([8be52bd](https://github.com/adobe/helix-cli/commit/8be52bdb4e01620ace938cb96ad23c06329c554d))

## [7.5.4](https://github.com/adobe/helix-cli/compare/v7.5.3...v7.5.4) (2020-02-25)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v3.1.6 ([#1313](https://github.com/adobe/helix-cli/issues/1313)) ([ffaec6c](https://github.com/adobe/helix-cli/commit/ffaec6c301c797335fa31f16c4367428403f1a7b))

## [7.5.3](https://github.com/adobe/helix-cli/compare/v7.5.2...v7.5.3) (2020-02-25)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v3.1.5 ([2c3a9ae](https://github.com/adobe/helix-cli/commit/2c3a9ae2b05e843de74218d27d566d927052bccc))

## [7.5.2](https://github.com/adobe/helix-cli/compare/v7.5.1...v7.5.2) (2020-02-25)


### Bug Fixes

* **deps:** update dependency @adobe/helix-log to v4.5.1 ([a3c80b4](https://github.com/adobe/helix-cli/commit/a3c80b478074a6b25b3d732f488c8237e8cd54cd))

## [7.5.1](https://github.com/adobe/helix-cli/compare/v7.5.0...v7.5.1) (2020-02-24)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v5.2.2 ([#1310](https://github.com/adobe/helix-cli/issues/1310)) ([971f1ee](https://github.com/adobe/helix-cli/commit/971f1eee6e830124f922ba1fea2285349a3932b3))

# [7.5.0](https://github.com/adobe/helix-cli/compare/v7.4.2...v7.5.0) (2020-02-18)


### Features

* **up.cmd.js:** watch helix-query.yaml and restart on modification ([#1307](https://github.com/adobe/helix-cli/issues/1307)) ([0e73a63](https://github.com/adobe/helix-cli/commit/0e73a6313ef5ceaa82b258c8d9a529527bc031f4)), closes [#1301](https://github.com/adobe/helix-cli/issues/1301)

## [7.4.2](https://github.com/adobe/helix-cli/compare/v7.4.1...v7.4.2) (2020-02-18)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v3.1.4 ([#1303](https://github.com/adobe/helix-cli/issues/1303)) ([c49fca5](https://github.com/adobe/helix-cli/commit/c49fca5f258ce8db22464232622ad1f8fca2f8c8))

## [7.4.1](https://github.com/adobe/helix-cli/compare/v7.4.0...v7.4.1) (2020-02-14)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([2491bb6](https://github.com/adobe/helix-cli/commit/2491bb6ff585ab337bcc5baaf41824e2f0b0c8d3))

# [7.4.0](https://github.com/adobe/helix-cli/compare/v7.3.7...v7.4.0) (2020-02-13)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v3.1.1 ([#1300](https://github.com/adobe/helix-cli/issues/1300)) ([fd58006](https://github.com/adobe/helix-cli/commit/fd580065725be51b6904b3fa1c0cd87784044f97))


### Features

* **up:** hlx up: add optional parameters --algolia-app-id, --algolia-api-key ([#1295](https://github.com/adobe/helix-cli/issues/1295)) ([#1299](https://github.com/adobe/helix-cli/issues/1299)) ([95ccc77](https://github.com/adobe/helix-cli/commit/95ccc77c4340ba8f9d237e809a5f728fe7aa83db))

## [7.3.7](https://github.com/adobe/helix-cli/compare/v7.3.6...v7.3.7) (2020-02-13)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v3.1.0 ([#1298](https://github.com/adobe/helix-cli/issues/1298)) ([1a15de3](https://github.com/adobe/helix-cli/commit/1a15de32645a0a9e0b55b368d92b1c1b44832e2e))

## [7.3.6](https://github.com/adobe/helix-cli/compare/v7.3.5...v7.3.6) (2020-02-12)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v3.0.9 ([#1297](https://github.com/adobe/helix-cli/issues/1297)) ([ce8c2e1](https://github.com/adobe/helix-cli/commit/ce8c2e1498749fad7984148214126016f85c8a1e))

## [7.3.5](https://github.com/adobe/helix-cli/compare/v7.3.4...v7.3.5) (2020-02-12)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v5.2.0 ([8a4950c](https://github.com/adobe/helix-cli/commit/8a4950c12187d2a9d9c07569d3dcffad47533b9a))

## [7.3.4](https://github.com/adobe/helix-cli/compare/v7.3.3...v7.3.4) (2020-02-12)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v3.0.8 ([703ee7d](https://github.com/adobe/helix-cli/commit/703ee7d73f7402c284e734d58c05832fe27a191e))

## [7.3.3](https://github.com/adobe/helix-cli/compare/v7.3.2...v7.3.3) (2020-02-05)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([#1289](https://github.com/adobe/helix-cli/issues/1289)) ([5f1b54c](https://github.com/adobe/helix-cli/commit/5f1b54ca0be1d7c4176fb53075d2df4b373be232))

## [7.3.2](https://github.com/adobe/helix-cli/compare/v7.3.1...v7.3.2) (2020-01-30)


### Bug Fixes

* **.npmignore:** revert some changes which broke 'hlx demo' ([#1287](https://github.com/adobe/helix-cli/issues/1287)) ([6bb6d87](https://github.com/adobe/helix-cli/commit/6bb6d87c9e78074caf5aa2f2b34f58703e90d0b4)), closes [#1285](https://github.com/adobe/helix-cli/issues/1285)

## [7.3.1](https://github.com/adobe/helix-cli/compare/v7.3.0...v7.3.1) (2020-01-29)


### Bug Fixes

* **publish:** fix parameter passing for publish ([4e6110d](https://github.com/adobe/helix-cli/commit/4e6110d2d3de7434d3653a676501d17fd8fd06fb))

# [7.3.0](https://github.com/adobe/helix-cli/compare/v7.2.5...v7.3.0) (2020-01-29)


### Features

* **config:** load `helix-query.yaml` on start ([7834b39](https://github.com/adobe/helix-cli/commit/7834b39ab4f91b66d00090d9ef834e5aecd54531))
* **config:** load `helix-query.yaml` on start ([d07a476](https://github.com/adobe/helix-cli/commit/d07a476763891253d94adb6c19305cd6ed4c8cc4))
* **publish:** add CLI options for Algolia API Key and Algolia App ID ([b2d2143](https://github.com/adobe/helix-cli/commit/b2d214341fb6af77c7cebda2eefaefa8785cb20e))
* **publish:** add CLI options for Algolia API Key and Algolia App ID ([ef31edb](https://github.com/adobe/helix-cli/commit/ef31edb23afd72d23a3ffe18ba1dee795968c945))
* **publish:** send index config to helix-publish service ([f87a400](https://github.com/adobe/helix-cli/commit/f87a400567608b03f6313f6126db3ef48e9050cd))
* **publish:** send index config to helix-publish service ([ab837cf](https://github.com/adobe/helix-cli/commit/ab837cf858215d13810b013a27301936abf4476a))

## [7.2.5](https://github.com/adobe/helix-cli/compare/v7.2.4...v7.2.5) (2020-01-27)


### Bug Fixes

* **log:** ensure progress bar uses log correctly ([#1281](https://github.com/adobe/helix-cli/issues/1281)) ([1890994](https://github.com/adobe/helix-cli/commit/18909942c108da00dbffa81c5487384934abd33e)), closes [#1280](https://github.com/adobe/helix-cli/issues/1280)

## [7.2.4](https://github.com/adobe/helix-cli/compare/v7.2.3...v7.2.4) (2020-01-24)


### Bug Fixes

* **cli:** use correct parameter to initialize the log level ([#1278](https://github.com/adobe/helix-cli/issues/1278)) ([1794b93](https://github.com/adobe/helix-cli/commit/1794b9336da519e8e1c8a0eb53bd94c5130e800b)), closes [#1276](https://github.com/adobe/helix-cli/issues/1276)

## [7.2.3](https://github.com/adobe/helix-cli/compare/v7.2.2...v7.2.3) (2020-01-24)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([#1277](https://github.com/adobe/helix-cli/issues/1277)) ([c950054](https://github.com/adobe/helix-cli/commit/c950054f718624245ee51f961ed8484c1d5b6e08))

## [7.2.2](https://github.com/adobe/helix-cli/compare/v7.2.1...v7.2.2) (2020-01-23)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([#1274](https://github.com/adobe/helix-cli/issues/1274)) ([68d557b](https://github.com/adobe/helix-cli/commit/68d557b5acfb8de117b9f02c66a829c2f8e1ec98))

## [7.2.1](https://github.com/adobe/helix-cli/compare/v7.2.0...v7.2.1) (2020-01-22)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v3.0.2 ([#1273](https://github.com/adobe/helix-cli/issues/1273)) ([f06f267](https://github.com/adobe/helix-cli/commit/f06f267d05732be053b3a75c1b5717220aac09a1))

# [7.2.0](https://github.com/adobe/helix-cli/compare/v7.1.1...v7.2.0) (2020-01-22)


### Features

* **logging:** use helix-log ([#1250](https://github.com/adobe/helix-cli/issues/1250)) ([9b74c62](https://github.com/adobe/helix-cli/commit/9b74c62eafdd6148dfe605d44f97bad43e041b1a))

## [7.1.1](https://github.com/adobe/helix-cli/compare/v7.1.0...v7.1.1) (2020-01-20)


### Bug Fixes

* **deps:** update external ([#1271](https://github.com/adobe/helix-cli/issues/1271)) ([46ea3d3](https://github.com/adobe/helix-cli/commit/46ea3d38f3d5e88d7afacb76812fd6633a2f70fb))

# [7.1.0](https://github.com/adobe/helix-cli/compare/v7.0.6...v7.1.0) (2020-01-17)


### Features

* **cli:** dev-defaults can be set with env vars ([#1270](https://github.com/adobe/helix-cli/issues/1270)) ([3ae6c9a](https://github.com/adobe/helix-cli/commit/3ae6c9a3b488ac461d278bb217d4034d184b5a5a)), closes [#1266](https://github.com/adobe/helix-cli/issues/1266)

## [7.0.6](https://github.com/adobe/helix-cli/compare/v7.0.5...v7.0.6) (2020-01-15)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v4.0.1 ([a7cfb9b](https://github.com/adobe/helix-cli/commit/a7cfb9bbabad1509549cdb313bb653cacacd7513))

## [7.0.5](https://github.com/adobe/helix-cli/compare/v7.0.4...v7.0.5) (2020-01-15)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v4 ([#1263](https://github.com/adobe/helix-cli/issues/1263)) ([cea59b4](https://github.com/adobe/helix-cli/commit/cea59b410c8792ed979736c3413fe620337bf8a0))

## [7.0.4](https://github.com/adobe/helix-cli/compare/v7.0.3...v7.0.4) (2020-01-14)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v2.17.11 ([794624c](https://github.com/adobe/helix-cli/commit/794624cfed0de18a72b8d5fc7b6b4eb32f77358c))

## [7.0.3](https://github.com/adobe/helix-cli/compare/v7.0.2...v7.0.3) (2020-01-14)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([#1257](https://github.com/adobe/helix-cli/issues/1257)) ([27e2b8c](https://github.com/adobe/helix-cli/commit/27e2b8ca558f64aecc38fd829d04e0cfdf9c3716))

## [7.0.2](https://github.com/adobe/helix-cli/compare/v7.0.1...v7.0.2) (2020-01-10)


### Bug Fixes

* **publish:** use correct default version (v3) for publish API ([#1258](https://github.com/adobe/helix-cli/issues/1258)) ([ca49f20](https://github.com/adobe/helix-cli/commit/ca49f208dc78a297d1c7cfe71a99f3f777838d0c)), closes [#1254](https://github.com/adobe/helix-cli/issues/1254) [#1254](https://github.com/adobe/helix-cli/issues/1254)

## [7.0.1](https://github.com/adobe/helix-cli/compare/v7.0.0...v7.0.1) (2020-01-07)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([#1247](https://github.com/adobe/helix-cli/issues/1247)) ([9bae9ef](https://github.com/adobe/helix-cli/commit/9bae9ef43ebe12263f6f656983f5ae05930e3eb4))

# [7.0.0](https://github.com/adobe/helix-cli/compare/v6.2.0...v7.0.0) (2020-01-06)


### Bug Fixes

* **dependencies:** npm audit fix ([9ffcc16](https://github.com/adobe/helix-cli/commit/9ffcc16e10489b57f967bc5306ed14d485ff9959))


### Features

* **publish:** use new v3 publish service with dynamic defaults ([7431a24](https://github.com/adobe/helix-cli/commit/7431a24bb450e386e7fc07c57c253b6f1f6c3552)), closes [adobe/helix-publish#264](https://github.com/adobe/helix-publish/issues/264)


### BREAKING CHANGES

* **publish:** the new version has support for dynamic defaults

# [6.2.0](https://github.com/adobe/helix-cli/compare/v6.1.1...v6.2.0) (2019-12-17)


### Features

* **tests:** Tests should accept a specific pipeline version (git repo) as a parameter ([#1243](https://github.com/adobe/helix-cli/issues/1243)) ([d976aea](https://github.com/adobe/helix-cli/commit/d976aead20f95a5f455c742a86fbe82cdc0c8801))

## [6.1.1](https://github.com/adobe/helix-cli/compare/v6.1.0...v6.1.1) (2019-12-02)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v2.17.5 ([#1237](https://github.com/adobe/helix-cli/issues/1237)) ([e09daaa](https://github.com/adobe/helix-cli/commit/e09daaad13d6bf03e3269e98cffa845f33925218))

# [6.1.0](https://github.com/adobe/helix-cli/compare/v6.0.7...v6.1.0) (2019-11-25)


### Features

* **build:** automatically install helix-pipeline during build ([#1222](https://github.com/adobe/helix-cli/issues/1222)) ([85b39d6](https://github.com/adobe/helix-cli/commit/85b39d6d181b50582b6c27de9ab1ccdeda48bd99)), closes [#1200](https://github.com/adobe/helix-cli/issues/1200)

## [6.0.7](https://github.com/adobe/helix-cli/compare/v6.0.6...v6.0.7) (2019-11-19)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v2.17.4 ([46bee95](https://github.com/adobe/helix-cli/commit/46bee958a2fdf3a2de0d68bcee4b9405b2d01422))

## [6.0.6](https://github.com/adobe/helix-cli/compare/v6.0.5...v6.0.6) (2019-11-18)


### Bug Fixes

* **deps:** update [@adobe](https://github.com/adobe) ([#1232](https://github.com/adobe/helix-cli/issues/1232)) ([a0719e2](https://github.com/adobe/helix-cli/commit/a0719e2a91d45556145799c3012be84a91d9664b))

## [6.0.5](https://github.com/adobe/helix-cli/compare/v6.0.4...v6.0.5) (2019-11-18)


### Bug Fixes

* **deps:** update external ([#1230](https://github.com/adobe/helix-cli/issues/1230)) ([4165259](https://github.com/adobe/helix-cli/commit/41652592bd2e5f971e49d134446005e956cdc26c))

## [6.0.4](https://github.com/adobe/helix-cli/compare/v6.0.3...v6.0.4) (2019-11-17)


### Bug Fixes

* **deps:** update dependency yargs to v15 ([d3336f1](https://github.com/adobe/helix-cli/commit/d3336f1d92062085cb28335af22243a7679d5472))

## [6.0.3](https://github.com/adobe/helix-cli/compare/v6.0.2...v6.0.3) (2019-11-15)


### Bug Fixes

* **package:** ensure correct module resolution order ([#1229](https://github.com/adobe/helix-cli/issues/1229)) ([ad59326](https://github.com/adobe/helix-cli/commit/ad59326100abdcff08cf23137aadf01bb1a880cc)), closes [#1228](https://github.com/adobe/helix-cli/issues/1228)

## [6.0.2](https://github.com/adobe/helix-cli/compare/v6.0.1...v6.0.2) (2019-11-14)


### Bug Fixes

* **deps:** update dependency @adobe/helix-pipeline to v6.0.2 ([4c3f68f](https://github.com/adobe/helix-cli/commit/4c3f68fb2edc754083fe07c02a34a478dd2079f1))

## [6.0.1](https://github.com/adobe/helix-cli/compare/v6.0.0...v6.0.1) (2019-11-11)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v3.2.8 ([#1221](https://github.com/adobe/helix-cli/issues/1221)) ([6e6f69d](https://github.com/adobe/helix-cli/commit/6e6f69d459de58b20fbdab8fb72275cab8e15e62))

# [6.0.0](https://github.com/adobe/helix-cli/compare/v5.9.3...v6.0.0) (2019-11-11)


### Bug Fixes

* **deps:** update dependency @adobe/helix-pipeline to v6 ([#1218](https://github.com/adobe/helix-cli/issues/1218)) ([1818c0c](https://github.com/adobe/helix-cli/commit/1818c0c59b2cf6b9aa2733858b191d20a00f1395))


### BREAKING CHANGES

* **deps:** **@adobe/helix-pipeline@6.0.0:** icons are now rendered as `<svg>` instead of `<img>` tags. If icons are used in a project, CSS changes will be required.

## [5.9.3](https://github.com/adobe/helix-cli/compare/v5.9.2...v5.9.3) (2019-11-11)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v2.17.2 ([#1217](https://github.com/adobe/helix-cli/issues/1217)) ([ae2041c](https://github.com/adobe/helix-cli/commit/ae2041c080036f2a76e4c3dbfe7e9ef7dbe4d60e))

## [5.9.2](https://github.com/adobe/helix-cli/compare/v5.9.1...v5.9.2) (2019-11-07)


### Bug Fixes

* **renovatebot:** avoid using unsupported regex syntax in packagePatterns ([57e64a4](https://github.com/adobe/helix-cli/commit/57e64a42566cdd3984d7e86cdcc398d15048b8dc))

## [5.9.1](https://github.com/adobe/helix-cli/compare/v5.9.0...v5.9.1) (2019-11-07)


### Bug Fixes

* **dev:** use correct sourcemap information from htlengine ([#1213](https://github.com/adobe/helix-cli/issues/1213)) ([63df557](https://github.com/adobe/helix-cli/commit/63df557d36997249e1439fd3b73ec1dbeace7795))

# [5.9.0](https://github.com/adobe/helix-cli/compare/v5.8.5...v5.9.0) (2019-11-07)


### Features

* **build:** create transparent builds ([#1198](https://github.com/adobe/helix-cli/issues/1198)) ([6fbb1f1](https://github.com/adobe/helix-cli/commit/6fbb1f167b7e7b1c538289bc6a403f00ee9c7cbb)), closes [#1197](https://github.com/adobe/helix-cli/issues/1197)

## [5.8.5](https://github.com/adobe/helix-cli/compare/v5.8.4...v5.8.5) (2019-11-07)


### Bug Fixes

* **up:** default to --local-repo=. ([#1209](https://github.com/adobe/helix-cli/issues/1209)) ([a5a024e](https://github.com/adobe/helix-cli/commit/a5a024ebd586ac253b42bcf59061b4684e2908b6)), closes [#913](https://github.com/adobe/helix-cli/issues/913)

## [5.8.4](https://github.com/adobe/helix-cli/compare/v5.8.3...v5.8.4) (2019-11-06)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v2.17.1 ([41e81c2](https://github.com/adobe/helix-cli/commit/41e81c2764511504eb12c277aa701b4507e0cc84))

## [5.8.3](https://github.com/adobe/helix-cli/compare/v5.8.2...v5.8.3) (2019-11-06)


### Bug Fixes

* **deps:** update any ([e0de44b](https://github.com/adobe/helix-cli/commit/e0de44b637384c5de17308a8ab27dabf1fcb1c32))

## [5.8.2](https://github.com/adobe/helix-cli/compare/v5.8.1...v5.8.2) (2019-11-06)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v2.17.0 ([#1208](https://github.com/adobe/helix-cli/issues/1208)) ([38d262f](https://github.com/adobe/helix-cli/commit/38d262f4303576fb7ba2ced3f3d479ec363e4aad))

## [5.8.1](https://github.com/adobe/helix-cli/compare/v5.8.0...v5.8.1) (2019-11-06)


### Bug Fixes

* **deps:** update dependency @adobe/helix-shared to v3.1.2 ([#1207](https://github.com/adobe/helix-cli/issues/1207)) ([31d9ed6](https://github.com/adobe/helix-cli/commit/31d9ed653724ff188876c282916ceb0b49a68525))

# [5.8.0](https://github.com/adobe/helix-cli/compare/v5.7.8...v5.8.0) (2019-11-06)


### Features

* **up:** automatically add GITHUB_TOKEN to dev params. ([#1206](https://github.com/adobe/helix-cli/issues/1206)) ([42689a1](https://github.com/adobe/helix-cli/commit/42689a1a71495a8efbccbc7c70c81af8cd286635)), closes [#1199](https://github.com/adobe/helix-cli/issues/1199)

## [5.7.8](https://github.com/adobe/helix-cli/compare/v5.7.7...v5.7.8) (2019-11-05)


### Bug Fixes

* **up.cmd:** support `hlx up` in local repo checkout without configured origin ([#1201](https://github.com/adobe/helix-cli/issues/1201)) ([991ce5e](https://github.com/adobe/helix-cli/commit/991ce5ee0eaf7d2a0b031e3206d23988b5751f15)), closes [#1189](https://github.com/adobe/helix-cli/issues/1189)

## [5.7.7](https://github.com/adobe/helix-cli/compare/v5.7.6...v5.7.7) (2019-11-05)


### Bug Fixes

* **deps:** update any ([#1204](https://github.com/adobe/helix-cli/issues/1204)) ([a57b18e](https://github.com/adobe/helix-cli/commit/a57b18e2c12dd58a49e50e08ed1c55c2200f8414))

## [5.7.6](https://github.com/adobe/helix-cli/compare/v5.7.5...v5.7.6) (2019-11-04)


### Bug Fixes

* **deps:** update any ([#1203](https://github.com/adobe/helix-cli/issues/1203)) ([7944c5e](https://github.com/adobe/helix-cli/commit/7944c5e766a5973dd2e78d5f0452c2b657a4ec48))

## [5.7.5](https://github.com/adobe/helix-cli/compare/v5.7.4...v5.7.5) (2019-10-31)


### Bug Fixes

* **deps:** update any ([#1196](https://github.com/adobe/helix-cli/issues/1196)) ([0d4c70a](https://github.com/adobe/helix-cli/commit/0d4c70ad8bbb61e113df0e7df73bac2e3ddd6147))

## [5.7.4](https://github.com/adobe/helix-cli/compare/v5.7.3...v5.7.4) (2019-10-29)


### Bug Fixes

* **deps:** reset failing isomorphic-git dependency ([c912d8e](https://github.com/adobe/helix-cli/commit/c912d8e8a287d864d946cb3594d4bd6460982a96)), closes [#1187](https://github.com/adobe/helix-cli/issues/1187)
* **deps:** update any ([c79b95e](https://github.com/adobe/helix-cli/commit/c79b95ebf9a42d1f99c563413b6ec20efb6907fc))
* **deps:** update dependency open to v7 ([#1188](https://github.com/adobe/helix-cli/issues/1188)) ([f68f1c2](https://github.com/adobe/helix-cli/commit/f68f1c261447591b05e36051e0d2b39c1f8472f8))

## [5.7.3](https://github.com/adobe/helix-cli/compare/v5.7.2...v5.7.3) (2019-10-24)


### Bug Fixes

* **package:** use latest pipeline ([#1194](https://github.com/adobe/helix-cli/issues/1194)) ([a41f269](https://github.com/adobe/helix-cli/commit/a41f26937dc09fc70429dcc1d33ba7042c47950d))

## [5.7.2](https://github.com/adobe/helix-cli/compare/v5.7.1...v5.7.2) (2019-10-24)


### Bug Fixes

* **package:** use latest pipeline ([2494acb](https://github.com/adobe/helix-cli/commit/2494acb))

## [5.7.1](https://github.com/adobe/helix-cli/compare/v5.7.0...v5.7.1) (2019-10-23)


### Bug Fixes

* **deps:** update to @adobe/helix-pipeline 5.6.0 ([bcfa693](https://github.com/adobe/helix-cli/commit/bcfa693))

# [5.7.0](https://github.com/adobe/helix-cli/compare/v5.6.5...v5.7.0) (2019-10-17)

### Features

* **publish:** warn if remote logging fails ([#1183](https://github.com/adobe/helix-cli/issues/1183)) ([05afe3a](https://github.com/adobe/helix-cli/commit/05afe3a))

## [5.6.5](https://github.com/adobe/helix-cli/compare/v5.6.4...v5.6.5) (2019-10-16)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v2.13.9 ([#1185](https://github.com/adobe/helix-cli/issues/1185)) ([faff2df](https://github.com/adobe/helix-cli/commit/faff2df))

## [5.6.4](https://github.com/adobe/helix-cli/compare/v5.6.3...v5.6.4) (2019-10-16)


### Bug Fixes

* **deps:** update any ([#1184](https://github.com/adobe/helix-cli/issues/1184)) ([a4c862f](https://github.com/adobe/helix-cli/commit/a4c862f))

## [5.6.3](https://github.com/adobe/helix-cli/compare/v5.6.2...v5.6.3) (2019-10-15)


### Bug Fixes

* **deps:** update dependency object-hash to v2 ([#1181](https://github.com/adobe/helix-cli/issues/1181)) ([b5c4db8](https://github.com/adobe/helix-cli/commit/b5c4db8))

## [5.6.2](https://github.com/adobe/helix-cli/compare/v5.6.1...v5.6.2) (2019-10-08)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v2.13.8 ([#1179](https://github.com/adobe/helix-cli/issues/1179)) ([c51baa7](https://github.com/adobe/helix-cli/commit/c51baa7))

## [5.6.1](https://github.com/adobe/helix-cli/compare/v5.6.0...v5.6.1) (2019-10-08)


### Bug Fixes

* **deps:** update any ([#1175](https://github.com/adobe/helix-cli/issues/1175)) ([58c7fa0](https://github.com/adobe/helix-cli/commit/58c7fa0))
* **deps:** update dependency @adobe/helix-simulator to v2.13.7 ([#1177](https://github.com/adobe/helix-cli/issues/1177)) ([e3016e0](https://github.com/adobe/helix-cli/commit/e3016e0))

# [5.6.0](https://github.com/adobe/helix-cli/compare/v5.5.0...v5.6.0) (2019-10-07)


### Features

* **ci:** No smoke tests for PR from forks ([671636f](https://github.com/adobe/helix-cli/commit/671636f))

# [5.5.0](https://github.com/adobe/helix-cli/compare/v5.4.8...v5.5.0) (2019-10-07)


### Bug Fixes

* **security:** high severity vulnerability in deps ([05ba7ea](https://github.com/adobe/helix-cli/commit/05ba7ea))


### Features

* reduce `WARN`s during `npm install` ([897ca6e](https://github.com/adobe/helix-cli/commit/897ca6e)), closes [#973](https://github.com/adobe/helix-cli/issues/973)

## [5.4.8](https://github.com/adobe/helix-cli/compare/v5.4.7...v5.4.8) (2019-10-07)


### Bug Fixes

* **deploy:** use major version for helix-statix fixes [#1165](https://github.com/adobe/helix-cli/issues/1165) ([#1166](https://github.com/adobe/helix-cli/issues/1166)) ([8598e36](https://github.com/adobe/helix-cli/commit/8598e36))

## [5.4.7](https://github.com/adobe/helix-cli/compare/v5.4.6...v5.4.7) (2019-10-07)


### Bug Fixes

* **deps:** update dependency @adobe/htlengine to v3.2.3 ([#1171](https://github.com/adobe/helix-cli/issues/1171)) ([f41c06c](https://github.com/adobe/helix-cli/commit/f41c06c))

## [5.4.6](https://github.com/adobe/helix-cli/compare/v5.4.5...v5.4.6) (2019-10-03)


### Bug Fixes

* **publish:** clear GITHUB_TOKEN from edge dictionary if given ([#1163](https://github.com/adobe/helix-cli/issues/1163)) ([74d470a](https://github.com/adobe/helix-cli/commit/74d470a)), closes [#1162](https://github.com/adobe/helix-cli/issues/1162)

## [5.4.5](https://github.com/adobe/helix-cli/compare/v5.4.4...v5.4.5) (2019-10-03)


### Bug Fixes

* **deps:** update any ([#1164](https://github.com/adobe/helix-cli/issues/1164)) ([168feeb](https://github.com/adobe/helix-cli/commit/168feeb))

## [5.4.4](https://github.com/adobe/helix-cli/compare/v5.4.3...v5.4.4) (2019-10-02)


### Bug Fixes

* **deps:** update any ([#1161](https://github.com/adobe/helix-cli/issues/1161)) ([781b510](https://github.com/adobe/helix-cli/commit/781b510))

## [5.4.3](https://github.com/adobe/helix-cli/compare/v5.4.2...v5.4.3) (2019-10-01)


### Bug Fixes

* **deps:** npm audit fix dependencies ([5eb3a8d](https://github.com/adobe/helix-cli/commit/5eb3a8d))
* **deps:** update any ([#1160](https://github.com/adobe/helix-cli/issues/1160)) ([61cbf4a](https://github.com/adobe/helix-cli/commit/61cbf4a))

## [5.4.2](https://github.com/adobe/helix-cli/compare/v5.4.1...v5.4.2) (2019-09-30)


### Bug Fixes

* **deps:** update dependency @adobe/helix-pipeline to v5.5.3 ([08f18ee](https://github.com/adobe/helix-cli/commit/08f18ee))

## [5.4.1](https://github.com/adobe/helix-cli/compare/v5.4.0...v5.4.1) (2019-09-30)


### Bug Fixes

* **deps:** update dependency @adobe/helix-simulator to v2.13.5 ([#1157](https://github.com/adobe/helix-cli/issues/1157)) ([e5d85f6](https://github.com/adobe/helix-cli/commit/e5d85f6))

# [5.4.0](https://github.com/adobe/helix-cli/compare/v5.3.0...v5.4.0) (2019-09-18)


### Features

* **pub:** defaults debugKey to serviceid ([#1153](https://github.com/adobe/helix-cli/issues/1153)) ([d32fc46](https://github.com/adobe/helix-cli/commit/d32fc46))

# [5.3.0](https://github.com/adobe/helix-cli/compare/v5.2.1...v5.3.0) (2019-09-17)


### Bug Fixes

* **deps:** update dependency @adobe/helix-pipeline to v5.5.2 ([869b490](https://github.com/adobe/helix-cli/commit/869b490))


### Features

* **pub:** fix tests ([2a3d5fb](https://github.com/adobe/helix-cli/commit/2a3d5fb))
* **pub:** fix tests and remove yargs-debug.js ([6fd1e42](https://github.com/adobe/helix-cli/commit/6fd1e42))
* **pub:** protect X-Debug with key ([518060d](https://github.com/adobe/helix-cli/commit/518060d))
* **pub:** support for debug key added ([ff3e7fb](https://github.com/adobe/helix-cli/commit/ff3e7fb))

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
