import * as core from '@actions/core';
import { collectContext } from './collectors/index.js';
import { renderConsole, formatDiagnostic } from './reporters/console.js';
import { createOutputs } from './reporters/outputs.js';
import { renderSummary } from './reporters/summary.js';
import { resultFor, runRules } from './rules/index.js';
import type { ActionInputs, Diagnostic } from './types.js';

export function readInputs(): ActionInputs {
  return {
    packageDir: core.getInput('package-dir') || '.',
    expected: {
      owner: core.getInput('expected-owner') || undefined,
      repository: core.getInput('expected-repository') || undefined,
      workflow: core.getInput('expected-workflow') || undefined,
      environment: core.getInput('expected-environment') || undefined,
    },
    failOnWarning: core.getInput('fail-on-warning')
      ? core.getBooleanInput('fail-on-warning')
      : false,
  };
}

export async function runAction(): Promise<void> {
  try {
    const inputs = readInputs();
    // Official toolkit API. The token is decoded locally, never exchanged with npm.
    const context = await collectContext(inputs, () => core.getIDToken());
    const diagnostics = runRules(context);
    const result = resultFor(diagnostics, inputs.failOnWarning);
    for (const [name, value] of Object.entries(
      createOutputs(context, diagnostics, result),
    ))
      core.setOutput(name, value);
    core.info(renderConsole(context, diagnostics, result));
    for (const diagnostic of diagnostics) {
      const text = formatDiagnostic(diagnostic);
      if (diagnostic.severity === 'error')
        core.error(text, { title: diagnostic.ruleId });
      else if (diagnostic.severity === 'warning')
        core.warning(text, { title: diagnostic.ruleId });
    }
    try {
      await core.summary
        .addRaw(renderSummary(context, diagnostics, result))
        .write();
    } catch {
      core.warning(
        'Could not write the GitHub Job Summary. Diagnostics remain available in the console and issues output.',
      );
    }
    if (result === 'fail')
      core.setFailed(
        'OIDC Publish Doctor found blocking diagnostics. Review the issues and suggested fixes above.',
      );
  } catch {
    // Never stringify an exception: it may include a token, npmrc line, or command stderr.
    const issue: Diagnostic = {
      ruleId: 'CTX004',
      severity: 'error',
      title: 'Preflight collection could not complete',
      message:
        'The Action could not safely finish reading inputs or collecting observations. Internal error details are withheld to protect credentials.',
      expected: 'Valid inputs and a readable checked-out package',
      actual: 'Collection failed',
      fix: 'Use true or false for fail-on-warning, check package-dir and file permissions, and rerun. If this persists, report the Action version and sanitized configuration.',
    };
    core.setOutput('result', 'fail');
    core.setOutput('issues', JSON.stringify([issue]));
    for (const name of [
      'github-owner',
      'github-repository',
      'workflow',
      'environment',
    ])
      core.setOutput(name, '');
    core.setFailed(formatDiagnostic(issue));
  }
}
