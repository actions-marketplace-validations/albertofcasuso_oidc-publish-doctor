import type { Rule } from '../types.js';

export const authRules: Rule[] = [
  {
    id: 'AUTH001',
    check: (c) =>
      c.npm.nodeAuthTokenPresent
        ? {
            ruleId: 'AUTH001',
            severity: 'warning',
            title: 'NODE_AUTH_TOKEN is present',
            message:
              'A token can be legitimate for installing private dependencies. Current npm tries OIDC first, but token fallback may obscure a broken Trusted Publisher identity.',
            expected: 'No unintended token authentication in the publish step',
            actual: 'NODE_AUTH_TOKEN exists (value withheld)',
            fix: 'Scope dependency-install tokens to the install step. Remove unintended NODE_AUTH_TOKEN from the doctor and publish steps.',
          }
        : null,
  },
  {
    id: 'AUTH002',
    check: (c) =>
      c.npm.authConfigurationDetected
        ? {
            ruleId: 'AUTH002',
            severity: 'warning',
            title: 'npm authentication configuration detected',
            message:
              'npmrc or npm configuration environment variables contain authentication settings. These may be intentional, including setup-node placeholders; their presence does not prove OIDC will fail.',
            expected: 'Intentional publish-time authentication configuration',
            actual: 'Authentication keys detected; all values withheld',
            fix: 'Review project, user, and global npmrc files and npm_config auth variables. Keep install credentials scoped to installation and verify publishing uses the intended OIDC identity.',
          }
        : null,
  },
];
