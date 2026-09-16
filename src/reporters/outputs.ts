import type { Diagnostic, DiagnosticContext, Result } from '../types.js';

export function createOutputs(
  c: DiagnosticContext,
  diagnostics: Diagnostic[],
  result: Result,
): Record<string, string> {
  return {
    result,
    issues: JSON.stringify(diagnostics),
    'github-owner': c.github.owner ?? '',
    'github-repository': c.github.repository ?? '',
    workflow: c.github.workflowFilename ?? '',
    environment: c.github.environment ?? '',
  };
}
