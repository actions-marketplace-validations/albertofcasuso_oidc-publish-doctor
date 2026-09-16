import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DiagnosticContext } from '../types.js';
import { normalizeGithubRepository } from '../utils/github-repository.js';

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function string(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export async function collectPackage(
  cwd: string,
): Promise<DiagnosticContext['package']> {
  let text: string;
  try {
    text = await readFile(join(cwd, 'package.json'), 'utf8');
  } catch {
    return { status: 'unreadable' };
  }
  try {
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data))
      return { status: 'invalid' };
    const pkg = record(data);
    const repository = record(pkg.repository);
    const url = string(pkg.repository) ?? string(repository.url);
    return {
      status: 'read',
      name: string(pkg.name),
      repositoryUrl: url,
      normalizedRepository: url ? normalizeGithubRepository(url) : undefined,
      repositoryDirectory: string(repository.directory),
      publishRegistry: string(record(pkg.publishConfig).registry),
    };
  } catch {
    return { status: 'invalid' };
  }
}
