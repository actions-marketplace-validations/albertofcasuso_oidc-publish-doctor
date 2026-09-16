import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import type { DiagnosticContext } from '../types.js';
import type { Redactor } from '../utils/redact.js';
import { runCommand, type Command } from './command.js';

/** Values are consumed only for redaction; callers receive a boolean, never raw lines. */
export function inspectNpmrc(
  text: string,
  env: NodeJS.ProcessEnv,
  redactor: Redactor,
): boolean {
  let detected = false;
  for (const line of text.split(/\r?\n/)) {
    const entry = line.trim();
    if (!entry || /^[#;]/.test(entry)) continue;
    const equals = entry.indexOf('=');
    if (equals < 0) continue;
    const key = entry.slice(0, equals).trim();
    if (
      !/(?:^|:)(?:_authToken|_auth|username|_password|password)(?:\[\])?$/i.test(
        key,
      )
    )
      continue;
    detected = true;
    const value = entry.slice(equals + 1).trim();
    redactor.add(value);
    const unquoted = value.replace(/^(['"])(.*)\1$/, '$2');
    redactor.add(unquoted);
    // npmrc interpolation can refer to variables with non-secret-looking names.
    const expanded = unquoted.replace(/\$\{([^}]+)\}/g, (_, name: string) => {
      redactor.add(env[name]);
      return env[name] ?? '';
    });
    redactor.add(expanded);
    // Inline comments are valid in npm's INI format. Register the value too.
    redactor.add(unquoted.split(/[;#]/)[0]?.trim());
  }
  return detected;
}

export async function collectNpm(
  cwd: string,
  packageName: string | undefined,
  env: NodeJS.ProcessEnv,
  redactor: Redactor,
  command: Command = runCommand,
): Promise<DiagnosticContext['npm']> {
  const scope = packageName?.match(/^(@[a-z0-9._-]+)\//)?.[1];
  const [registry, userconfig, globalconfig, prefix, scopedRegistry] =
    await Promise.all([
      command('npm', ['config', 'get', 'registry'], cwd),
      command('npm', ['config', 'get', 'userconfig'], cwd),
      command('npm', ['config', 'get', 'globalconfig'], cwd),
      command('npm', ['prefix'], cwd),
      scope
        ? command('npm', ['config', 'get', `${scope}:registry`], cwd)
        : undefined,
    ]);
  const configuredUser = env.npm_config_userconfig ?? env.NPM_CONFIG_USERCONFIG;
  const configuredGlobal =
    env.npm_config_globalconfig ?? env.NPM_CONFIG_GLOBALCONFIG;
  const files = new Set([
    join(cwd, '.npmrc'),
    ...(prefix ? [join(prefix, '.npmrc')] : []),
    configuredUser ??
      userconfig ??
      join(env.HOME ?? env.USERPROFILE ?? homedir(), '.npmrc'),
    ...((configuredGlobal ?? globalconfig)
      ? [configuredGlobal ?? globalconfig!]
      : []),
  ]);
  let detected = false;
  let incomplete = !registry || !userconfig || !globalconfig || !prefix;
  for (const file of files) {
    try {
      const content = await readFile(resolve(cwd, file), 'utf8');
      detected = inspectNpmrc(content, env, redactor) || detected;
    } catch (error) {
      if (!(
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        incomplete = true;
    }
  }
  for (const [key, value] of Object.entries(env)) {
    if (
      /^npm_config_.*(?:_authToken|_auth|username|_password|password)$/i.test(
        key,
      )
    ) {
      detected = true;
      redactor.add(value);
    }
  }
  return {
    registry,
    scopedRegistry:
      scopedRegistry && !['undefined', 'null'].includes(scopedRegistry)
        ? scopedRegistry
        : undefined,
    nodeAuthTokenPresent: Object.hasOwn(env, 'NODE_AUTH_TOKEN'),
    authConfigurationDetected: detected,
    configInspectionIncomplete: incomplete,
  };
}
