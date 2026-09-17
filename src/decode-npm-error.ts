import type { Diagnostic, DiagnosticContext } from './types.js';
import { runRules } from './rules/index.js';

/** Returns hypotheses, never echoes raw logs (which may contain credentials). */
export function decodeNpmError(
  log: string,
  context: DiagnosticContext,
): Diagnostic[] {
  const symptoms = [
    /\bENEEDAUTH\b/i.test(log) && 'ENEEDAUTH',
    /\bE404\b/i.test(log) && /\bPUT\b/i.test(log) && 'E404 during publish PUT',
    /package\s+not\s+found/i.test(log) && 'package not found',
    /npm\s+adduser/i.test(log) && 'npm adduser suggestion',
  ].filter((value): value is string => Boolean(value));
  if (!symptoms.length) return [];
  const candidates = runRules(context)
    .filter((d) => d.severity !== 'info')
    .map((d) => d.ruleId);
  return [
    {
      ruleId: 'NPMERR001',
      severity: 'info',
      title: 'npm publish symptoms need configuration review',
      message:
        'These errors have multiple causes, including identity, permissions, registry, package access, and missing packages. They do not identify a unique OIDC failure.',
      expected: 'Publish succeeds using the intended registry and identity',
      actual: symptoms.join(', '),
      fix: candidates.length
        ? `Review possible causes already detected: ${candidates.join(', ')}. Also verify registry and package access.`
        : 'Local preflight checks found no blocking issue. Verify the Trusted Publisher is saved on this exact npm package, that its owner/repository/caller workflow/environment match, and that it allows npm publish. Also check the registry and npm OIDC token exchange; neither npm server-side settings nor the exchange is verified by these checks.',
      likelySymptoms: symptoms,
    },
  ];
}
