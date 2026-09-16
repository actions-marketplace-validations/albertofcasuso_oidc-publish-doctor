import { resolve } from 'node:path';
import type { ActionInputs, DiagnosticContext } from '../types.js';
import { Redactor, redactEnvironment } from '../utils/redact.js';
import { collectGithub } from './github.js';
import { collectNpm } from './npm.js';
import { collectOidc } from './oidc.js';
import { collectPackage } from './package-json.js';
import { collectVersions } from './node.js';

export async function collectContext(
  inputs: ActionInputs,
  getToken: () => Promise<string>,
  env: NodeJS.ProcessEnv = process.env,
): Promise<DiagnosticContext> {
  const cwd = resolve(env.GITHUB_WORKSPACE ?? process.cwd(), inputs.packageDir);
  const redactor = new Redactor();
  redactEnvironment(env, redactor);
  const [pkg, versions, oidc] = await Promise.all([
    collectPackage(cwd),
    collectVersions(cwd),
    collectOidc(getToken, redactor),
  ]);
  const npm = await collectNpm(cwd, pkg.name, env, redactor);
  return redactor.sanitize({
    ...versions,
    package: pkg,
    npm,
    oidc: { status: oidc.status },
    github: collectGithub(oidc.claims, env, oidc.status === 'available'),
    expected: inputs.expected,
  });
}
