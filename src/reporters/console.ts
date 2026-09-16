import type { Diagnostic, DiagnosticContext, Result } from '../types.js';

export function environmentRows(c: DiagnosticContext): [string, string][] {
  return [
    ['Runner', c.github.runnerEnvironment ?? 'unavailable'],
    ['Node on PATH', c.nodeVersion ?? 'unavailable'],
    ['npm on PATH', c.npmVersion ?? 'unavailable'],
    ['OIDC token', c.oidc.status],
    ['Repository', c.github.repository ?? 'unavailable'],
    ['Caller workflow', c.github.workflowFilename ?? 'unavailable'],
    ['Environment', c.github.environment ?? 'not observed'],
    [
      'Identity source',
      c.github.identitySource === 'oidc'
        ? 'OIDC claims (environment fallback for missing fields)'
        : 'GitHub environment fallback',
    ],
    ['Default registry', c.npm.registry ?? 'unavailable'],
    ...(c.npm.scopedRegistry
      ? [['Scoped registry', c.npm.scopedRegistry] as [string, string]]
      : []),
    ...(c.package.publishRegistry
      ? [
          ['publishConfig.registry', c.package.publishRegistry] as [
            string,
            string,
          ],
        ]
      : []),
  ];
}

export function formatDiagnostic(d: Diagnostic): string {
  const symbol = { error: '✗', warning: '⚠', info: 'ℹ' }[d.severity];
  return [
    `${symbol} ${d.ruleId} — ${d.title}`,
    d.message,
    d.expected !== undefined
      ? `Expected:\n  ${d.expected.replace(/\n/g, '\n  ')}`
      : '',
    d.actual !== undefined
      ? `Observed:\n  ${d.actual.replace(/\n/g, '\n  ')}`
      : '',
    d.fix ? `Fix:\n  ${d.fix.replace(/\n/g, '\n  ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function renderConsole(
  c: DiagnosticContext,
  diagnostics: Diagnostic[],
  result: Result,
): string {
  return [
    'OIDC Publish Doctor',
    '',
    ...environmentRows(c).map(
      ([label, value]) => `${label}: ${value.replace(/\r?\n/g, ' ')}`,
    ),
    '',
    ...diagnostics.map((d) => `${formatDiagnostic(d)}\n`),
    `${result === 'pass' ? '✓' : result === 'warn' ? '⚠' : '✗'} Result: ${result}`,
    'Preflight checks do not verify the configuration saved on npm.',
  ].join('\n');
}
