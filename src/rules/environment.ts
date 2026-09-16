import type { Rule } from '../types.js';

export const environmentRules: Rule[] = [
  {
    id: 'ENV001',
    check: (c) =>
      c.expected.environment &&
      !c.github.environment &&
      c.oidc.status === 'available'
        ? {
            ruleId: 'ENV001',
            severity: 'error',
            title: 'Expected GitHub environment is missing',
            message:
              'An environment was supplied for the npm Trusted Publisher but the OIDC token contains no environment claim.',
            expected: c.expected.environment,
            actual: 'No environment claim',
            fix: `Set environment: "${c.expected.environment}" on the publishing job, or correct the npm configuration and expected-environment input.`,
          }
        : null,
  },
  {
    id: 'ENV003',
    check: (c) =>
      c.expected.environment &&
      c.github.environment &&
      c.expected.environment !== c.github.environment
        ? {
            ruleId: 'ENV003',
            severity: 'error',
            title: 'Trusted Publisher environment mismatch',
            message:
              'The supplied npm environment and GitHub OIDC environment differ. Environment identity matching is case-sensitive.',
            expected: c.expected.environment,
            actual: c.github.environment,
            fix: `Align the npm Trusted Publisher environment and expected-environment with "${c.github.environment}", or change the publishing job environment.`,
          }
        : null,
  },
];
