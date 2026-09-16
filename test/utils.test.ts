import { expect, it } from 'vitest';
import {
  normalizeGithubRepository,
  workflowFilename,
} from '../src/utils/github-repository.js';
import { decodeClaims } from '../src/utils/jwt.js';
import { decodeNpmError } from '../src/decode-npm-error.js';
import { happy } from './fixtures/contexts.js';

it('normalizes common GitHub URL formats without changing identity case', () => {
  for (const url of [
    'https://github.com/Foo/Bar',
    'https://github.com/Foo/Bar.git',
    'git+https://github.com/Foo/Bar.git',
    'git://github.com/Foo/Bar.git',
    'git@github.com:Foo/Bar.git',
    'github:Foo/Bar',
    'ssh://git@github.com/Foo/Bar.git',
    'https://github.com/Foo/Bar.git/',
  ])
    expect(normalizeGithubRepository(url)).toBe('Foo/Bar');
});
it('rejects unrelated hosts, nested paths, misleading authorities and malformed URLs', () => {
  for (const url of [
    'https://gitlab.com/foo/bar',
    'https://github.com.evil.test/foo/bar',
    'https://github.com@evil.test/foo/bar',
    'https://github.com/foo/bar/tree/main',
    'https://github.com/foo/bar?token=secret',
    'https://github.com/foo/bar#main',
    'https://github.com:8443/foo/bar',
    'github:foo/bar/baz',
    'foo/bar',
    '',
    'file://github.com/foo/bar',
    'https://github.com/foo/%62ar',
  ])
    expect(normalizeGithubRepository(url)).toBeUndefined();
});
it('extracts workflow filenames independently of ref slashes and rejects display names', () => {
  expect(
    workflowFilename('org/repo/.github/workflows/release.yml@refs/tags/v1'),
  ).toBe('release.yml');
  expect(
    workflowFilename(
      'org/repo/.github/workflows/release.yaml@refs/heads/feature/@test',
    ),
  ).toBe('release.yaml');
  for (const ref of [
    undefined,
    'Release Package',
    'release.yml',
    'org/repo/release.yml@main',
    'org/repo/.github/workflows/sub/release.yml@main',
  ])
    expect(workflowFilename(ref)).toBeUndefined();
});
it('decodes only allowlisted string claims and never retains the complete JWT', () => {
  const payload = {
    repository: 'org/repo',
    environment: 123,
    sub: 'private',
    unexpected: 'secret',
  };
  const token = `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
  expect(decodeClaims(token)).toEqual({ repository: 'org/repo' });
  for (const bad of [
    '',
    'a.b',
    'a.@@.c',
    'a.bnVsbA.c',
    'a.W10.c',
    'a.bm90LWpzb24.c',
  ])
    expect(decodeClaims(bad)).toBeUndefined();
});
it('decodes ambiguous npm symptoms without echoing logs or claiming a unique cause', () => {
  const c = happy();
  c.expected.owner = 'wrong';
  const log =
    'ENEEDAUTH E404 PUT package not found; run npm adduser; fake-secret-value';
  const result = decodeNpmError(log, c);
  expect(result[0]?.likelySymptoms).toHaveLength(4);
  expect(result[0]?.fix).toContain('PUB001');
  expect(result[0]?.message).toContain('multiple causes');
  expect(JSON.stringify(result)).not.toContain('fake-secret-value');
  expect(decodeNpmError('E404 GET install failed', c)).toEqual([]);
  expect(decodeNpmError('success', c)).toEqual([]);
});
