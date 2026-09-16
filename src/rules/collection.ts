import type { Rule } from '../types.js';

export const collectionRules: Rule[] = [
  {
    id: 'CTX001',
    check: (c) =>
      c.package.status !== 'read'
        ? {
            ruleId: 'CTX001',
            severity: 'error',
            title: 'Cannot inspect package.json',
            message:
              'The selected package manifest could not be read as a JSON object. Package diagnostics cannot run reliably.',
            expected: 'Readable package.json JSON object in package-dir',
            actual: c.package.status,
            fix: 'Check out the repository before this step, set package-dir to the publishing package, and correct malformed JSON or file permissions.',
          }
        : null,
  },
  {
    id: 'CTX002',
    check: (c) =>
      c.npm.configInspectionIncomplete
        ? {
            ruleId: 'CTX002',
            severity: 'warning',
            title: 'npm configuration inspection is incomplete',
            message:
              'An npm configuration query failed or a configuration file could not be read. Authentication warnings may be incomplete; command output is withheld to protect credentials.',
            expected: 'Readable npm configuration',
            actual: 'At least one configuration source is unavailable',
            fix: 'Verify npm config works from package-dir and that project, user, and global npmrc files are readable. For workspaces, inspect root configuration as well.',
          }
        : null,
  },
  {
    id: 'CTX003',
    check(c) {
      const missing = [
        !c.github.owner && 'owner',
        !c.github.repository && 'repository',
        !c.github.workflowFilename && 'caller workflow',
        !c.github.runnerEnvironment && 'runner environment',
      ].filter(Boolean);
      return missing.length
        ? {
            ruleId: 'CTX003',
            severity: 'warning',
            title: 'GitHub identity observation is incomplete',
            message:
              'Missing claims or environment variables prevent some comparisons. A missing observation is not evidence of an identity match.',
            expected: 'GitHub repository, caller workflow and runner identity',
            actual: `Unavailable: ${missing.join(', ')}`,
            fix: 'Run in a GitHub Actions job with id-token: write and verify the job exposes the standard OIDC claims and GitHub environment variables.',
          }
        : null;
    },
  },
];
