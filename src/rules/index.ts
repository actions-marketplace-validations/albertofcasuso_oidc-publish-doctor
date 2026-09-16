import type { Diagnostic, DiagnosticContext, Result, Rule } from '../types.js';
import { Redactor } from '../utils/redact.js';
import { authRules } from './auth.js';
import { collectionRules } from './collection.js';
import { environmentRules } from './environment.js';
import { oidcRules } from './oidc.js';
import { packageRules } from './package.js';
import { publisherRules } from './publisher.js';
import { registryRules } from './registry.js';
import { runtimeRules } from './runtime.js';

export const rules: Rule[] = [
  ...collectionRules,
  ...oidcRules,
  ...runtimeRules,
  ...authRules,
  ...publisherRules,
  ...environmentRules,
  ...packageRules,
  ...registryRules,
];

export function runRules(context: DiagnosticContext): Diagnostic[] {
  return new Redactor().sanitize(
    rules.flatMap((rule) => rule.check(context) ?? []),
  );
}

export function resultFor(
  diagnostics: Diagnostic[],
  failOnWarning = false,
): Result {
  if (diagnostics.some((d) => d.severity === 'error')) return 'fail';
  if (diagnostics.some((d) => d.severity === 'warning'))
    return failOnWarning ? 'fail' : 'warn';
  return 'pass';
}
