import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';

// Exercise the shipped artifact outside this repository, with no node_modules,
// actual npm subprocesses, isolated npm configuration, and Actions output files.
const dir = await mkdtemp(join(tmpdir(), 'oidc-doctor-smoke-'));
try {
  await copyFile(resolve('dist/index.js'), join(dir, 'action.mjs'));
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({
      name: 'doctor-smoke',
      version: '1.0.0',
      repository: 'github:example/package',
    }),
  );
  await writeFile(
    join(dir, '.npmrc'),
    '//registry.npmjs.org/:_authToken=fake-npmrc-secret\n',
  );
  await writeFile(join(dir, 'global.npmrc'), '');
  await writeFile(join(dir, 'output'), '');
  await writeFile(join(dir, 'summary'), '');
  const result = await new Promise((resolveRun) => {
    execFile(
      process.execPath,
      [join(dir, 'action.mjs')],
      {
        cwd: dir,
        timeout: 30000,
        env: {
          PATH: process.env.PATH,
          ...(process.env.SystemRoot
            ? { SystemRoot: process.env.SystemRoot }
            : {}),
          HOME: dir,
          USERPROFILE: dir,
          NPM_CONFIG_USERCONFIG: join(dir, '.npmrc'),
          NPM_CONFIG_GLOBALCONFIG: join(dir, 'global.npmrc'),
          NPM_CONFIG_CACHE: join(dir, 'cache'),
          NODE_AUTH_TOKEN: 'fake-node-secret',
          GITHUB_REPOSITORY: 'example/package',
          GITHUB_WORKSPACE: dir,
          GITHUB_WORKFLOW_REF:
            'example/package/.github/workflows/publish.yml@refs/heads/main',
          RUNNER_ENVIRONMENT: 'github-hosted',
          GITHUB_OUTPUT: join(dir, 'output'),
          GITHUB_STEP_SUMMARY: join(dir, 'summary'),
        },
      },
      (error, stdout, stderr) => resolveRun({ error, stdout, stderr }),
    );
  });
  // No OIDC endpoint is configured: fail safely with a diagnosis and all outputs.
  assert.equal(result.error?.code, 1);
  const output = await readFile(join(dir, 'output'), 'utf8');
  const summary = await readFile(join(dir, 'summary'), 'utf8');
  const all = [result.stdout, result.stderr, output, summary].join('\n');
  assert.match(output, /result<<[^\n]+\nfail\n/);
  assert.match(output, /OIDC001/);
  assert.match(output, /AUTH001/);
  assert.match(output, /AUTH002/);
  assert.doesNotMatch(output, /CTX00[124]|NPM001|NODE001/);
  assert.match(summary, /<h2>Suggested fixes<\/h2>/);
  assert.match(result.stdout, /OIDC Publish Doctor/);
  assert.doesNotMatch(all, /fake-npmrc-secret|fake-node-secret/);
  process.stdout.write('Standalone bundle smoke test passed.\n');
} finally {
  await rm(dir, { recursive: true, force: true });
}
