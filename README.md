# OIDC Publish Doctor

```text
npm ERR! code E404
npm ERR! 404 Not Found
```

But the package exists.

OIDC Publish Doctor checks the local configuration and GitHub identity that npm
Trusted Publishing depends on, immediately before `npm publish`. It explains likely
failures with observed values and concrete fixes. npm still performs the publish.

## Quick start

Configure a GitHub Trusted Publisher in your package's npm settings first. Supply
those same values as `expected-*` inputs. This Action does **not** retrieve your
saved npm configuration. The first stable release is
`albertofcasuso/oidc-publish-doctor@v0.1.0`. Pin that exact tag while evaluating
the Action.

Save this as `.github/workflows/publish.yml` in the package repository:

```yaml
name: Publish
on:
  workflow_dispatch:

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
          registry-url: https://registry.npmjs.org
          package-manager-cache: false
      - run: npm ci
      - run: npm run build --if-present
      - name: Diagnose npm Trusted Publishing
        uses: albertofcasuso/oidc-publish-doctor@v0.1.0
        with:
          expected-owner: my-org
          expected-repository: my-package
          expected-workflow: publish.yml
      - run: npm publish
```

The job needs `id-token: write` to request an OIDC token. `contents: read` permits
checkout. Run the doctor after setup/build and with the same environment and npm
configuration as the publish step. For monorepos, set `package-dir: packages/core`
and publish from that same directory. `npm ci` credentials for private dependencies
should be scoped to that install step.

The disabled [example workflow](.github/workflows/example-publish.yml) can be copied
to a package repository. Remove its `if: ${{ false }}` guard and replace placeholders.
This repository itself is private in npm metadata to prevent accidental publishing.

## Inputs and outputs

| Input                  | Default | Meaning                                                                    |
| ---------------------- | ------- | -------------------------------------------------------------------------- |
| `package-dir`          | `.`     | Directory containing the published package.json, relative to the workspace |
| `expected-owner`       | empty   | Case-sensitive GitHub owner configured on npm                              |
| `expected-repository`  | empty   | Repository **name**, without owner, configured on npm                      |
| `expected-workflow`    | empty   | Caller workflow filename, including `.yml`/`.yaml`                         |
| `expected-environment` | empty   | Case-sensitive environment configured on npm                               |
| `fail-on-warning`      | `false` | Promote warnings to a failing result and exit status                       |

Empty expected inputs skip their comparisons. Empty `expected-environment` does not
assert that an environment must be absent.

Outputs: `result` (`pass`, `warn`, `fail`), `issues` (JSON diagnostic array),
`github-owner`, `github-repository` (`owner/name`), `workflow` (caller filename),
and `environment` (empty if unavailable). Informational diagnostics do not change
`pass`; warnings produce `warn` unless `fail-on-warning` is enabled. Errors fail the
step after writing outputs. `pass` means no implemented checks found a problem,
not that npm has accepted the identity. Human reports appear in the console and
GitHub Job Summary, with warning/error annotations.

## Checks

| ID               | Check                                                                      | Severity |
| ---------------- | -------------------------------------------------------------------------- | -------- |
| OIDC001          | Token acquisition or decoding failed; missing permission is a likely cause | Error    |
| OIDC002          | Self-hosted GitHub runner                                                  | Error    |
| NPM001 / NODE001 | npm ≥11.5.1 / Node ≥22.14.0 on the publishing PATH                         | Error    |
| AUTH001          | NODE_AUTH_TOKEN exists, even if empty                                      | Warning  |
| AUTH002          | Authentication keys in npmrc or npm_config environment                     | Warning  |
| PUB001 / PUB002  | Expected owner / repository differs                                        | Error    |
| PUB003           | Expected caller workflow filename differs                                  | Error    |
| PUB004           | Caller and reusable workflow identities observed                           | Info     |
| PUB005           | Expected workflow names the reusable workflow instead of caller            | Error    |
| ENV001 / ENV003  | Expected environment missing / different                                   | Error    |
| PKG001 / PKG002  | Package repository missing / different or unrecognized                     | Warning  |
| PKG003           | Monorepo repository.directory                                              | Info     |
| CTX001           | Unreadable or invalid package.json                                         | Error    |
| CTX002 / CTX003  | Incomplete npm configuration / GitHub identity observations                | Warning  |
| CTX004           | Action inputs or collection failed unexpectedly                            | Error    |

Requirements and design decisions are recorded with primary sources in
[verified behavior](docs/verified-behavior.md). Package metadata checks remain
warnings because provenance settings and package visibility can affect behavior.
Auth settings can be legitimate; neither `registry-url` nor a generated setup-node
placeholder is treated as proof of failure.

## Example diagnostic

```text
✗ PUB001 — Trusted Publisher owner mismatch
The supplied npm Trusted Publisher owner differs from the observed GitHub owner.
Trusted Publishing identity matching is exact and case-sensitive.
Expected:
  DagsHub
Observed:
  dagshub
Fix:
  Configure the npm Trusted Publisher owner as "dagshub" and update expected-owner to match.
```

## Security and privacy

**OIDC Publish Doctor does not upload your OIDC token or npm credentials.**

The Action requests a token from GitHub using `@actions/core.getIDToken()`, inspects
only selected identity claims locally, and discards the token. It never exchanges
that token with npm or sends it to another service. It does not validate the JWT
signature and is not an authentication boundary. There is no product backend,
telemetry, credential storage, or automatic npm configuration lookup.

Local npm commands read versions and individual non-auth configuration settings;
the Action never requests a full configuration dump. Authentication values read
from npmrc files are retained only in a temporary in-memory redactor and never put
in diagnostic context or reports. Token-like environment values, URL credentials,
and query strings are redacted. Raw command stderr, exceptions, JWT payloads, and
input publish logs are never reported. Repository/workflow names and other
non-secret observations appear in logs, outputs, and the Job Summary.

## Limitations

- No verification of saved npm identity, package ownership/existence, allowed
  publishing actions, version availability, or publish success. New npm Trusted
  Publishers may permit staged publishing only; enable direct `npm publish` in
  npm settings if that is your intended operation.
- OIDC claim gaps use standard GitHub environment fallbacks where available;
  missing observations are reported. Environment is taken only from the claim,
  never guessed from a customizable `sub` string.
- `REG001` is deferred: registry observations do not establish intended registry
  or predict future CLI/workspace overrides. Scoped and publishConfig registries
  are displayed separately. Use the same directory/configuration for publishing.
- `AUTH003` is deferred: generated auth placeholders cannot reliably identify a
  failing legacy setup-node version. `AUTH002` reports the configuration cautiously.
- `ENV002` is deferred: the optional string input cannot cleanly distinguish
  “expect absent” from “skip this check.”
- Built-in npmrc and CLI-injected credentials are not exhaustively inspected.
  Failed configuration reads produce a warning. No source files are modified.
- The pure `decodeNpmError(log, context)` module provides ambiguous error hints
  for future integration. The Action does not capture or run `npm publish`.

## Development and distribution

Use Node 24 and npm. Versions are pinned with a committed lockfile. TypeScript 6.0.3
is the latest 6.x release selected because typescript-eslint 8.70.0 declares
TypeScript support below 6.1; TypeScript 7 is deliberately not forced into that
unsupported combination.

```sh
npm ci
npm run all
```

Individual checks: `npm run lint`, `npm run typecheck`, `npm test`,
`npm run format:check`. Use `npm run format` and `npm run test:watch` while editing.

`npm run build` (also `npm run package`) bundles the Node 24 Action with esbuild
into `dist/index.js` and writes dependency licenses to `dist/licenses.txt`.
Commit **both** files together with source changes. Consumers need no install or
build step. `npm run check:dist` regenerates in memory and rejects stale artifacts;
CI checks this before building so it cannot hide an uncommitted bundle update.

The pipeline is `collectors → DiagnosticContext → pure rules → reporters`.
`src/action.ts` is the GitHub adapter. Tests exercise rule fixtures, normalization,
missing observations, secret redaction, output policy, and reporting failures.
GitHub OIDC acquisition has been verified on a GitHub-hosted runner. You can repeat
the check in **Actions → Test real GitHub OIDC → Run workflow**.
The [manual smoke workflow](.github/workflows/smoke.yml) executes the local Action
with a real token and an isolated, private package fixture. It requires `pass` and
never publishes or contacts npm to exchange the token. It needs no npm secrets,
Trusted Publisher configuration, release tag, or Marketplace listing. This tests
GitHub token acquisition and diagnostics, not npm's acceptance of the identity.

This is the first stable release. Use an exact release tag; releases before 1.0.0
may introduce breaking changes.

For an end-to-end npm publication, follow the
[sandbox publishing guide](docs/sandbox-publishing.md). Its manual workflow
generates the sandbox package in the runner, runs Doctor, and publishes a new
version through OIDC. Configure the npm Trusted Publisher before running it.

MIT licensed.
