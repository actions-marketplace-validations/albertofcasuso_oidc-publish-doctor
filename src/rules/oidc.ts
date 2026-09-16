import type { Rule } from '../types.js';

export const oidcRules: Rule[] = [
  {
    id: 'OIDC001',
    check: (c) =>
      c.oidc.status === 'available'
        ? null
        : {
            ruleId: 'OIDC001',
            severity: 'error',
            title: 'GitHub OIDC token unavailable',
            message:
              'Trusted Publishing needs a GitHub-issued OIDC token. Missing id-token permission is a likely cause; a token endpoint failure or malformed response is also possible.',
            expected: 'A readable GitHub OIDC token',
            actual: c.oidc.status,
            fix: 'Set job permissions:\npermissions:\n  contents: read\n  id-token: write\nFor reusable workflows, grant id-token: write to caller and called workflow. If already granted, check runner connectivity and GitHub Actions status.',
            likelySymptoms: ['ENEEDAUTH', 'npm adduser suggestion'],
          },
  },
  // npm supported CI providers: https://docs.npmjs.com/trusted-publishers/
  {
    id: 'OIDC002',
    check: (c) =>
      c.github.runnerEnvironment === 'self-hosted'
        ? {
            ruleId: 'OIDC002',
            severity: 'error',
            title:
              'Self-hosted runner is unsupported by npm Trusted Publishing',
            message:
              'npm currently supports GitHub-hosted runners for this publishing flow.',
            expected: 'github-hosted',
            actual: 'self-hosted',
            fix: 'Move the publish job to a GitHub-hosted runner, for example runs-on: ubuntu-latest.',
          }
        : null,
  },
];
