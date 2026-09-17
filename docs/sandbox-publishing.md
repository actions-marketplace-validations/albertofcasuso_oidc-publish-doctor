# Publish the sandbox through GitHub OIDC

This is a real publication test for `albertofcasuso-oidc-publish-doctor-sandbox`.
The first version was published manually. The Action itself remains a GitHub
Action; the root package is not published to npm.

## 1. Configure npm

Open the sandbox package on npm, then **Settings → Trusted Publisher → GitHub
Actions**. Create a publisher with these exact values:

| Field                | Value                       |
| -------------------- | --------------------------- |
| Organization or user | `albertofcasuso`            |
| Repository           | `oidc-publish-doctor`       |
| Workflow filename    | `publish-sandbox.yml`       |
| Environment name     | Leave empty                 |
| Allowed actions      | Enable direct `npm publish` |

Use only the workflow filename, not its path or display name. No npm token secret
is needed. The workflow already grants `id-token: write` to the publishing job.
Doctor compares the supplied expected values with GitHub's observed identity;
it cannot verify that you saved these values on npm.

Source: [npm Trusted Publishing configuration](https://docs.npmjs.com/trusted-publishers/).

## 2. Push and run the workflow

Commit `.github/workflows/publish-sandbox.yml` and this guide and push them to the
repository's default branch. In GitHub, open **Actions → Publish sandbox with OIDC
→ Run workflow**. Select the default branch and enter a new version, initially
`0.0.2` if only `0.0.1` has been published.

The workflow creates the minimal package in the runner's temporary directory,
executes the bundled Action from the checkout, then runs `npm publish` from that
same package directory. It does not depend on the gitignored local sandbox and
does not install dependencies or build the Action. The committed `dist/` bundle
must be current. Versions must use `X.Y.Z` with no leading zeroes.

Expected outcome: Doctor reports `pass`, the publish step succeeds, and the new
version appears on npm. A green Doctor step alone does not prove npm accepted
the publication. Treat the publish step as the end-to-end result.

## Repeating the test

Use a new version for every successful publication (`0.0.3`, `0.0.4`, …). A
published name/version cannot be reused. If a run fails before publishing, first
check npm to see whether that version exists before reusing it. The input defaults
to `0.0.2`; it does not automatically increment. This workflow performs a real,
public publication rather than a dry run.

Source: [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/).

## If it fails

- `OIDC001`: check the publish job's `id-token: write` permission.
- `PUB001`, `PUB002`, or `PUB003`: compare the expected inputs, observed identity,
  and the fields saved on npm, preserving case.
- Doctor passes but npm returns `ENEEDAUTH` or `E404`: verify the publisher is
  configured on this exact npm package and permits `npm publish`. These messages
  alone do not prove a single cause. Review the publish log without sharing tokens.
- npm rejects an existing version: choose an unpublished version and rerun.

For negative diagnostic tests, use the non-publishing `smoke.yml` workflow. That
lets you check intentionally incorrect expected values without publishing a version.

### Why Doctor can pass before ENEEDAUTH

The supplied `expected-*` values can match GitHub even when the corresponding
publisher on npm is missing, configured differently, or does not permit direct
publishing. A readable GitHub OIDC token also does not prove that npm accepted a
token exchange. Doctor deliberately performs no exchange with npm.

For example, the sandbox run on 2026-09-17 used Node 24.20.0 and npm 11.19.0 and
obtained a GitHub token, but publishing still ended with ENEEDAUTH. The normal log
did not include the cause of the failed authentication. npm 11.19.0 logs OIDC
acquisition/exchange failures at verbose level and can then emit the generic
ENEEDAUTH message when no credentials are available. Confirm the saved npm
configuration before attributing this error to a specific mismatch. The token
deprecation notice alone is not proof that this workflow used a legacy npm token.

In this run, the maintainer subsequently confirmed an incorrect owner in npm's
Trusted Publisher. The workflow's expected-owner already matched GitHub, so the
preflight comparison passed while the saved npm configuration remained different.

Sources: [npm 11.19.0 OIDC handling](https://github.com/npm/cli/blob/v11.19.0/lib/utils/oidc.js)
and [publish authentication checks](https://github.com/npm/cli/blob/v11.19.0/lib/commands/publish.js).
