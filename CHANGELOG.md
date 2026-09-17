# Changelog

All notable changes to OIDC Publish Doctor are documented here.

The project follows [Semantic Versioning](https://semver.org/). Releases before
`1.0.0` may introduce breaking changes.

## [0.1.0] - 2026-09-17

First stable release. There are no functional changes relative to
`0.1.0-beta.1`.

## [0.1.0-beta.1] - 2026-09-17

First public beta.

### Added

- GitHub Action running on Node 24 with a committed JavaScript bundle.
- OIDC identity collection using GitHub's official Actions API; selected claims
  are inspected locally and the complete JWT is never reported.
- Preflight rules for OIDC availability, supported Node/npm versions, self-hosted
  runners, authentication indicators, publisher owner/repository/workflow and
  environment expectations, reusable workflows, package repository metadata, and
  monorepo package directories.
- Human-readable console report, GitHub Job Summary, annotations, structured
  `issues` output, and `pass`/`warn`/`fail` result output.
- Redaction safeguards for npm credentials, GitHub request tokens, OIDC JWTs,
  command stderr, and unexpected exceptions.
- CI, focused unit tests, a standalone bundle smoke test, and manual GitHub OIDC
  and sandbox-publishing workflows.

### Known limitations

- A passing preflight does not verify Trusted Publisher settings stored on npm,
  allowed publishing actions, package ownership, or npm's OIDC token exchange.
- Registry intent (`REG001`), legacy setup-node detection (`AUTH003`), and an
  explicit expected-absent environment (`ENV002`) are deferred.

[0.1.0-beta.1]: https://github.com/albertofcasuso/oidc-publish-doctor/releases/tag/v0.1.0-beta.1
[0.1.0]: https://github.com/albertofcasuso/oidc-publish-doctor/releases/tag/v0.1.0
