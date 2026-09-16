import type { DiagnosticContext } from '../../src/types.js';

export function happy(): DiagnosticContext {
  return {
    nodeVersion: '24.8.0',
    npmVersion: '11.6.0',
    oidc: { status: 'available' },
    github: {
      repository: 'dagshub/tmux-mobile',
      owner: 'dagshub',
      workflowRef:
        'dagshub/tmux-mobile/.github/workflows/release.yml@refs/tags/v1',
      workflowFilename: 'release.yml',
      environment: 'production',
      runnerEnvironment: 'github-hosted',
      identitySource: 'oidc',
    },
    package: {
      status: 'read',
      name: 'tmux-mobile',
      repositoryUrl: 'git+https://github.com/dagshub/tmux-mobile.git',
      normalizedRepository: 'dagshub/tmux-mobile',
    },
    npm: {
      registry: 'https://registry.npmjs.org/',
      nodeAuthTokenPresent: false,
      authConfigurationDetected: false,
      configInspectionIncomplete: false,
    },
    expected: {
      owner: 'dagshub',
      repository: 'tmux-mobile',
      workflow: 'release.yml',
      environment: 'production',
    },
  };
}

export const scenarios: Record<
  string,
  { rule: string; severity: string; change(c: DiagnosticContext): void }
> = {
  'old npm': {
    rule: 'NPM001',
    severity: 'error',
    change: (c) => {
      c.npmVersion = '11.5.0';
    },
  },
  'old Node': {
    rule: 'NODE001',
    severity: 'error',
    change: (c) => {
      c.nodeVersion = '22.13.1';
    },
  },
  'missing OIDC permission': {
    rule: 'OIDC001',
    severity: 'error',
    change: (c) => {
      c.oidc.status = 'unavailable';
    },
  },
  'self-hosted runner': {
    rule: 'OIDC002',
    severity: 'error',
    change: (c) => {
      c.github.runnerEnvironment = 'self-hosted';
    },
  },
  'NODE_AUTH_TOKEN present': {
    rule: 'AUTH001',
    severity: 'warning',
    change: (c) => {
      c.npm.nodeAuthTokenPresent = true;
    },
  },
  'npmrc auth configuration': {
    rule: 'AUTH002',
    severity: 'warning',
    change: (c) => {
      c.npm.authConfigurationDetected = true;
    },
  },
  'owner case mismatch': {
    rule: 'PUB001',
    severity: 'error',
    change: (c) => {
      c.expected.owner = 'DagsHub';
    },
  },
  'repository mismatch': {
    rule: 'PUB002',
    severity: 'error',
    change: (c) => {
      c.expected.repository = 'other';
    },
  },
  'workflow mismatch': {
    rule: 'PUB003',
    severity: 'error',
    change: (c) => {
      c.expected.workflow = 'publish.yml';
    },
  },
  'reusable workflow': {
    rule: 'PUB004',
    severity: 'info',
    change: (c) => {
      c.github.jobWorkflowRef =
        'org/ci/.github/workflows/npm-publish.yml@refs/heads/main';
      c.github.reusableWorkflowFilename = 'npm-publish.yml';
    },
  },
  'reusable/caller confusion': {
    rule: 'PUB005',
    severity: 'error',
    change: (c) => {
      c.github.jobWorkflowRef =
        'org/ci/.github/workflows/npm-publish.yml@refs/heads/main';
      c.github.reusableWorkflowFilename = 'npm-publish.yml';
      c.expected.workflow = 'npm-publish.yml';
    },
  },
  'missing environment': {
    rule: 'ENV001',
    severity: 'error',
    change: (c) => {
      delete c.github.environment;
    },
  },
  'environment mismatch': {
    rule: 'ENV003',
    severity: 'error',
    change: (c) => {
      c.expected.environment = 'Production';
    },
  },
  'missing package repository': {
    rule: 'PKG001',
    severity: 'warning',
    change: (c) => {
      delete c.package.repositoryUrl;
      delete c.package.normalizedRepository;
    },
  },
  'package repository mismatch': {
    rule: 'PKG002',
    severity: 'warning',
    change: (c) => {
      c.package.repositoryUrl = 'https://github.com/other/repo.git';
      c.package.normalizedRepository = 'other/repo';
    },
  },
  'monorepo package': {
    rule: 'PKG003',
    severity: 'info',
    change: (c) => {
      c.package.repositoryDirectory = 'packages/core';
    },
  },
  'invalid package': {
    rule: 'CTX001',
    severity: 'error',
    change: (c) => {
      c.package.status = 'invalid';
    },
  },
  'unreadable configuration': {
    rule: 'CTX002',
    severity: 'warning',
    change: (c) => {
      c.npm.configInspectionIncomplete = true;
    },
  },
  'missing identity claims': {
    rule: 'CTX003',
    severity: 'warning',
    change: (c) => {
      delete c.github.workflowFilename;
    },
  },
};
