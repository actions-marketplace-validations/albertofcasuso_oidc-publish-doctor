import { beforeEach, expect, it, vi } from 'vitest';
import * as core from '@actions/core';
import { collectContext } from '../src/collectors/index.js';
import { runAction } from '../src/action.js';
import { happy } from './fixtures/contexts.js';
import { renderSummary } from '../src/reporters/summary.js';
import { renderConsole } from '../src/reporters/console.js';
import { inspectNpmrc } from '../src/collectors/npm.js';
import { Redactor, redactEnvironment } from '../src/utils/redact.js';

vi.mock('@actions/core', () => ({
  getInput: vi.fn(() => ''),
  getBooleanInput: vi.fn(() => false),
  getIDToken: vi.fn(),
  setOutput: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  setFailed: vi.fn(),
  summary: {
    addRaw: vi.fn().mockReturnThis(),
    write: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../src/collectors/index.js', () => ({ collectContext: vi.fn() }));
beforeEach(() => {
  vi.mocked(collectContext).mockResolvedValue(happy());
  vi.mocked(core.getInput).mockReturnValue('');
  vi.mocked(core.getBooleanInput).mockReturnValue(false);
  vi.mocked(core.summary.write).mockResolvedValue(core.summary);
});

it('writes all six outputs and a Job Summary on successful execution', async () => {
  await runAction();
  expect(core.setOutput).toHaveBeenCalledTimes(6);
  expect(core.setOutput).toHaveBeenCalledWith('result', 'pass');
  expect(core.setOutput).toHaveBeenCalledWith(
    'github-repository',
    'dagshub/tmux-mobile',
  );
  expect(core.summary.write).toHaveBeenCalled();
  expect(core.setFailed).not.toHaveBeenCalled();
});
it('makes unverified npm authorization explicit even when all preflight checks pass', () => {
  const context = happy();
  const consoleReport = renderConsole(context, [], 'pass');
  const summary = renderSummary(context, [], 'pass');
  expect(consoleReport).toContain('Local preflight result: pass');
  expect(consoleReport).toContain('npm authorization: NOT VERIFIED');
  expect(consoleReport).toContain('they are not read from npm');
  expect(summary).toContain('npm publish authorization is not verified');
  expect(summary).toContain('not npm');
  for (const report of [consoleReport, summary]) {
    expect(report).toContain(context.package.name);
    expect(report).toContain('this exact npm package');
  }
});
it('sets failing outputs before marking the Action failed, including fail-on-warning', async () => {
  const c = happy();
  c.npm.nodeAuthTokenPresent = true;
  vi.mocked(collectContext).mockResolvedValue(c);
  vi.mocked(core.getInput).mockImplementation((name) =>
    name === 'fail-on-warning' ? 'true' : '',
  );
  vi.mocked(core.getBooleanInput).mockReturnValue(true);
  await runAction();
  expect(core.setOutput).toHaveBeenCalledWith('result', 'fail');
  expect(core.warning).toHaveBeenCalled();
  expect(core.setFailed).toHaveBeenCalledOnce();
  expect(vi.mocked(core.setOutput).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(core.setFailed).mock.invocationCallOrder[0]!,
  );
});
it('does not expose exceptions and still writes failing outputs if collection fails', async () => {
  vi.mocked(collectContext).mockRejectedValue(
    new Error('fake-request-secret fake-npm-secret'),
  );
  await runAction();
  expect(core.setOutput).toHaveBeenCalledWith('result', 'fail');
  const calls = JSON.stringify([
    vi.mocked(core.setOutput).mock.calls,
    vi.mocked(core.info).mock.calls,
    vi.mocked(core.warning).mock.calls,
    vi.mocked(core.setFailed).mock.calls,
  ]);
  expect(calls).not.toContain('fake-request-secret');
  expect(calls).not.toContain('fake-npm-secret');
  expect(calls).toContain('CTX004');
});
it('preserves outputs if summary writing fails and escapes untrusted HTML', async () => {
  vi.mocked(core.summary.write).mockRejectedValue(
    new Error('secret-summary-error'),
  );
  await runAction();
  expect(core.setOutput).toHaveBeenCalledWith('result', 'pass');
  expect(JSON.stringify(vi.mocked(core.warning).mock.calls)).not.toContain(
    'secret-summary-error',
  );
  const c = happy();
  c.github.environment = '<script>alert(1)</script>';
  expect(renderSummary(c, [], 'pass')).toContain('&lt;script&gt;');
  expect(renderSummary(c, [], 'pass')).not.toContain('<script>');
});
it('redacts env tokens, npmrc credentials, interpolated secrets, JWTs and log commands', () => {
  const redactor = new Redactor();
  const env = {
    NODE_AUTH_TOKEN: 'fake-node-secret',
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'fake-request-secret',
    CUSTOM_VALUE: 'fake-custom-secret',
  };
  redactEnvironment(env, redactor);
  expect(
    inspectNpmrc(
      '# _authToken=not-active\n; username=ignored\nregistry=https://registry.npmjs.org/',
      env,
      redactor,
    ),
  ).toBe(false);
  expect(
    inspectNpmrc(
      '//registry.npmjs.org/:_authToken=${CUSTOM_VALUE}\n_auth="fake-basic-secret"\nusername=fake-user-secret\n_password=fake-password-secret',
      env,
      redactor,
    ),
  ).toBe(true);
  const secrets = [
    ...Object.values(env),
    'fake-basic-secret',
    'fake-user-secret',
    'fake-password-secret',
  ];
  const output = redactor.text(
    `${secrets.join(' ')}\n::error::injected\neyJhbGciOiJub25lIn0.eyJ0b2tlbiI6InNlY3JldCJ9.signature`,
  );
  for (const secret of secrets) expect(output).not.toContain(secret);
  expect(output).not.toContain('::error::');
  expect(output).not.toContain('eyJhbG');
});
