import type { Diagnostic, DiagnosticContext, Result } from '../types.js';
import { environmentRows } from './console.js';

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
export function renderSummary(
  c: DiagnosticContext,
  diagnostics: Diagnostic[],
  result: Result,
): string {
  return (
    `<h1>OIDC Publish Doctor</h1>\n<p>Result: <strong>${result}</strong></p>\n` +
    '<h2>Environment</h2>\n<table>' +
    environmentRows(c)
      .map(
        ([key, value]) =>
          `<tr><th>${escape(key)}</th><td>${escape(value)}</td></tr>`,
      )
      .join('') +
    '</table>\n' +
    '<h2>Diagnostics</h2>\n' +
    (diagnostics.length
      ? diagnostics
          .map(
            (d) =>
              `<h3>${escape(d.ruleId)} — ${escape(d.title)} (${d.severity})</h3>\n<p>${escape(d.message)}</p>` +
              (d.expected !== undefined
                ? `<p>Expected:</p><pre>${escape(d.expected)}</pre>`
                : '') +
              (d.actual !== undefined
                ? `<p>Observed:</p><pre>${escape(d.actual)}</pre>`
                : ''),
          )
          .join('\n')
      : '<p>No issues detected by the preflight checks.</p>') +
    '\n<h2>Suggested fixes</h2>\n' +
    diagnostics
      .filter((d) => d.fix)
      .map((d) => `<p>${escape(d.ruleId)}</p><pre>${escape(d.fix ?? '')}</pre>`)
      .join('\n') +
    '\n<p>The configuration saved on npm is not verified by this Action.</p>\n'
  );
}
