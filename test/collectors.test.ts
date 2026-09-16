import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { collectGithub } from '../src/collectors/github.js';
import { collectPackage } from '../src/collectors/package-json.js';
import { collectNpm } from '../src/collectors/npm.js';
import { collectVersions } from '../src/collectors/node.js';
import { collectOidc } from '../src/collectors/oidc.js';
import { Redactor } from '../src/utils/redact.js';
import { createOutputs } from '../src/reporters/outputs.js';
import { renderConsole } from '../src/reporters/console.js';
import { renderSummary } from '../src/reporters/summary.js';
import { runRules } from '../src/rules/index.js';
import { happy } from './fixtures/contexts.js';

const directories: string[] = [];
async function temp() {
  const dir = await mkdtemp(join(tmpdir(), 'oidc-doctor-'));
  directories.push(dir);
  return dir;
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

it('prefers OIDC identity over environment and safely falls back for missing claims', () => {
  const env = {
    GITHUB_REPOSITORY: 'fallback/repo',
    GITHUB_WORKFLOW_REF: 'fallback/repo/.github/workflows/release.yml@main',
    RUNNER_ENVIRONMENT: 'github-hosted',
  };
  expect(
    collectGithub(
      { repository: 'Actual/repo', repository_owner: 'Actual' },
      env,
      true,
    ),
  ).toMatchObject({
    repository: 'Actual/repo',
    owner: 'Actual',
    workflowFilename: 'release.yml',
    environment: undefined,
  });
  expect(collectGithub({}, {}, false)).toMatchObject({
    identitySource: 'environment',
    workflowFilename: undefined,
  });
});
it('reads the publishing Node from PATH instead of the Action runtime and rejects arbitrary command output', async () => {
  const command = vi.fn(async (tool: string) =>
    tool === 'node' ? 'v20.19.0' : '11.6.0',
  );
  expect(await collectVersions('/package', command)).toEqual({
    nodeVersion: '20.19.0',
    npmVersion: '11.6.0',
  });
  expect(command).toHaveBeenCalledWith('node', ['--version'], '/package');
  expect(
    await collectVersions('/package', async () => 'some secret output'),
  ).toEqual({ nodeVersion: undefined, npmVersion: undefined });
});
it('handles unreadable, malformed and monorepo manifests without exposing parser errors', async () => {
  const dir = await temp();
  expect((await collectPackage(dir)).status).toBe('unreadable');
  await writeFile(join(dir, 'package.json'), '{ fake-secret');
  expect(await collectPackage(dir)).toEqual({ status: 'invalid' });
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({
      name: '@org/pkg',
      repository: { url: 'github:org/repo', directory: 'packages/core' },
      publishConfig: { registry: 'https://registry.npmjs.org/' },
    }),
  );
  expect(await collectPackage(dir)).toMatchObject({
    status: 'read',
    normalizedRepository: 'org/repo',
    repositoryDirectory: 'packages/core',
    publishRegistry: 'https://registry.npmjs.org/',
  });
});
it('handles OIDC acquisition and decode failures without preserving thrown secrets', async () => {
  const redactor = new Redactor();
  expect(
    await collectOidc(async () => {
      throw new Error('fake-request-token');
    }, redactor),
  ).toEqual({ status: 'unavailable', claims: {} });
  expect(await collectOidc(async () => 'fake-jwt', redactor)).toEqual({
    status: 'invalid',
    claims: {},
  });
  const token = `e30.${Buffer.from('{"repository":"org/repo"}').toString('base64url')}.sig`;
  expect(await collectOidc(async () => token, redactor)).toEqual({
    status: 'available',
    claims: { repository: 'org/repo' },
  });
  expect(redactor.text(token)).toBe('[REDACTED]');
});
it('inspects project/user/global npmrc and scoped registry without querying or reporting auth values', async () => {
  const dir = await temp();
  const pkg = join(dir, 'packages', 'core');
  await mkdir(pkg, { recursive: true });
  const user = join(dir, 'user.npmrc');
  const global = join(dir, 'global.npmrc');
  await writeFile(
    join(dir, '.npmrc'),
    '//registry.npmjs.org/:_authToken=fake-project-secret\n',
  );
  await writeFile(
    user,
    '//registry.npmjs.org/:_auth="fake-user-secret"\nusername=fake-user\n',
  );
  await writeFile(global, '//registry.npmjs.org/:_password=${CUSTOM_VALUE}\n');
  const command = vi.fn(async (_tool: string, args: string[]) => {
    if (args[0] === 'prefix') return dir;
    return (
      {
        userconfig: user,
        globalconfig: global,
        registry: 'https://registry.npmjs.org/',
        '@org:registry': 'https://npm.pkg.github.com/',
      } as Record<string, string>
    )[args[2] ?? ''];
  });
  const redactor = new Redactor();
  const npm = await collectNpm(
    pkg,
    '@org/core',
    { CUSTOM_VALUE: 'fake-global-secret', NODE_AUTH_TOKEN: '' },
    redactor,
    command,
  );
  expect(npm).toMatchObject({
    authConfigurationDetected: true,
    nodeAuthTokenPresent: true,
    scopedRegistry: 'https://npm.pkg.github.com/',
    configInspectionIncomplete: false,
  });
  const c = happy();
  c.npm = npm;
  c.package.repositoryUrl =
    'https://username:fake-url-password@gitlab.com/other/repo?token=fake-query-secret';
  c.expected.owner = 'fake-project-secret';
  c.expected.environment = 'fake-global-secret';
  c.package.repositoryDirectory = 'fake-user-secret';
  const safe = redactor.sanitize(c);
  const issues = runRules(safe);
  const rendered = JSON.stringify({
    safe,
    issues,
    outputs: createOutputs(safe, issues, 'warn'),
    console: renderConsole(safe, issues, 'warn'),
    summary: renderSummary(safe, issues, 'warn'),
  });
  for (const secret of [
    'fake-project-secret',
    'fake-user-secret',
    'fake-global-secret',
    'fake-url-password',
    'fake-query-secret',
  ])
    expect(rendered).not.toContain(secret);
  expect(
    command.mock.calls.every(([, args]) => !args.join(' ').includes('auth')),
  ).toBe(true);
});
