import type { DiagnosticContext, Rule } from '../types.js';

function reusable(c: DiagnosticContext): boolean {
  return Boolean(
    c.github.jobWorkflowRef &&
    c.github.workflowRef &&
    c.github.jobWorkflowRef !== c.github.workflowRef,
  );
}
function confusion(c: DiagnosticContext): boolean {
  return (
    reusable(c) &&
    Boolean(
      c.expected.workflow &&
      c.github.workflowFilename &&
      c.expected.workflow === c.github.reusableWorkflowFilename &&
      c.expected.workflow !== c.github.workflowFilename,
    )
  );
}

export const publisherRules: Rule[] = [
  {
    id: 'PUB001',
    check: (c) =>
      c.expected.owner && c.github.owner && c.expected.owner !== c.github.owner
        ? {
            ruleId: 'PUB001',
            severity: 'error',
            title: 'Trusted Publisher owner mismatch',
            message:
              'The supplied npm Trusted Publisher owner differs from the observed GitHub owner. Trusted Publishing identity matching is exact and case-sensitive.',
            expected: c.expected.owner,
            actual: c.github.owner,
            fix: `Configure the npm Trusted Publisher owner as "${c.github.owner}" and update expected-owner to match.`,
          }
        : null,
  },
  {
    id: 'PUB002',
    check(c) {
      const repository = c.github.repository?.split('/')[1];
      return c.expected.repository &&
        repository &&
        c.expected.repository !== repository
        ? {
            ruleId: 'PUB002',
            severity: 'error',
            title: 'Trusted Publisher repository mismatch',
            message:
              'The supplied repository name differs from the active GitHub repository. npm configures owner and repository name separately and matches case exactly.',
            expected: c.expected.repository,
            actual: repository,
            fix: `Configure the npm Trusted Publisher repository as "${repository}" (without the owner) and update expected-repository.`,
          }
        : null;
    },
  },
  {
    id: 'PUB003',
    check: (c) =>
      c.expected.workflow &&
      c.github.workflowFilename &&
      c.expected.workflow !== c.github.workflowFilename &&
      !confusion(c)
        ? {
            ruleId: 'PUB003',
            severity: 'error',
            title: 'Trusted Publisher caller workflow mismatch',
            message:
              'npm matches the caller workflow filename, including its extension. A display name, full path, or different filename will not match.',
            expected: c.expected.workflow,
            actual: c.github.workflowFilename,
            fix: `Configure the npm Trusted Publisher workflow as "${c.github.workflowFilename}" and update expected-workflow.`,
          }
        : null,
  },
  // GitHub claims: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-with-reusable-workflows
  {
    id: 'PUB004',
    check: (c) =>
      reusable(c)
        ? {
            ruleId: 'PUB004',
            severity: 'info',
            title: 'Reusable workflow detected',
            message:
              'workflow_ref describes the caller; job_workflow_ref identifies the called reusable workflow. npm documents validation against the caller workflow.',
            expected: `Caller workflow: ${c.github.workflowRef}`,
            actual: `Reusable workflow: ${c.github.jobWorkflowRef}`,
            fix: `Verify npm is configured with caller filename "${c.github.workflowFilename ?? '(unavailable)'}".`,
          }
        : null,
  },
  // Caller matching is explicitly described in npm's Trusted Publishing troubleshooting.
  {
    id: 'PUB005',
    check: (c) =>
      confusion(c)
        ? {
            ruleId: 'PUB005',
            severity: 'error',
            title: 'Reusable workflow configured instead of caller',
            message:
              'The supplied workflow matches the called reusable workflow. npm validates the calling workflow filename, even when npm publish runs in the reusable workflow.',
            expected: `Expected configured workflow: ${c.expected.workflow}`,
            actual: `Caller workflow: ${c.github.workflowFilename}\nReusable workflow: ${c.github.reusableWorkflowFilename}`,
            fix: `Configure npm with "${c.github.workflowFilename}" and use that filename for expected-workflow. Grant id-token: write to both workflows.`,
          }
        : null,
  },
];
