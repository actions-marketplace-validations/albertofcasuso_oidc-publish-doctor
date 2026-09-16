# External behavior and MVP decisions

Reviewed 2026-09-16. These are external contracts and must be rechecked when the
providers change. Context7 was unavailable during initialization; official docs,
published package metadata, and official source were used directly.

## npm

[Trusted Publishing documentation](https://docs.npmjs.com/trusted-publishers/)
documents npm ≥11.5.1 and Node ≥22.14.0, GitHub-hosted runners, case-sensitive
identity matching, workflow filenames, and caller identity for reusable workflows.
The corresponding checks compare observations with user-supplied expectations;
there is no claim of reading saved npm configuration. Token fallback is possible,
so authentication configuration merits review but is not a deterministic failure.

The same documentation requires repository metadata matching, but provenance can
be disabled. PKG001/PKG002 warn rather than make package metadata an unconditional
OIDC blocker. Allowed actions on npm's publisher configuration are not observable
here: a maintainer must confirm direct publishing is enabled when using npm publish.

## GitHub

[JavaScript Action metadata](https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax#runs-for-javascript-actions)
explicitly supports `runs.using: node24`.
[OIDC claims](https://docs.github.com/en/actions/reference/security/oidc) and
[reusable workflows](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-with-reusable-workflows)
distinguish caller claims from `job_workflow_ref` for the called workflow. The
human-readable `workflow` claim is not used as a filename. An unknown field is not
silently converted into a match. `sub` is not parsed because its format is customizable.

[Toolkit OIDC implementation](https://github.com/actions/toolkit/blob/main/packages/core/src/oidc-utils.ts)
provides `getIDToken()` and registers the returned JWT for runner masking. Our
collector drops exception details and the complete JWT after selecting claims.
[Toolkit exec](https://github.com/actions/toolkit/tree/main/packages/exec) runs local
commands silently, including Windows npm shims; the rule engine imports no toolkit APIs.

Verified latest releases: [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1)
and [setup-node v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0).
Examples use their v7 major tags.

## Configuration and deferred checks

[setup-node v7 authutil](https://github.com/actions/setup-node/blob/v7.0.0/src/authutil.ts)
still generates a NODE_AUTH_TOKEN placeholder and configures NPM_CONFIG_USERCONFIG.
It only exports NODE_AUTH_TOKEN if already supplied. Generated npmrc contents alone
do not identify the producing version or establish a legacy failure: AUTH003 is
deferred; AUTH002 makes the observation without attributing a cause.

[npmrc](https://docs.npmjs.com/cli/v11/configuring-npm/npmrc/) documents project, user,
global and built-in files and scoped authentication settings. The collector reads
package and npm-prefix project files plus resolved user/global files, with standard
environment overrides. Auth lines produce booleans and redaction values, never
reported key/value dumps. npm's own command is used for non-auth observations;
we do not recreate npm's full configuration parser or precedence rules.

[package.json publishConfig](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#publishconfig)
and scoped registry configuration can affect publishing. REG001 needs an explicit
intended-registry contract and tests against npm's actual workspace/publish/CLI
precedence before shipping. Current observations cannot prove npmjs intent.
ENV002 needs an unambiguous input model for an explicitly absent environment;
empty currently means unspecified. No sentinel such as "none" is invented.

## Toolchain

Packages were resolved from the npm registry's stable tags. TypeScript is pinned
to 6.0.3 to satisfy typescript-eslint's declared `>=4.8.4 <6.1.0` peer range;
latest TypeScript 7.0.2 did not satisfy it. No peer-dependency bypass was used.
[esbuild's Node bundling API](https://esbuild.github.io/api/#platform) produces ESM
for Node 24, with a createRequire bridge for bundled CommonJS dependencies.
