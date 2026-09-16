import type { Rule } from '../types.js';

// npm documents repository.url matching under Trusted Publishing troubleshooting.
// Missing metadata is a warning: provenance can be disabled and behavior varies.
export const packageRules: Rule[] = [
  {
    id: 'PKG001',
    check: (c) =>
      c.package.status === 'read' && !c.package.repositoryUrl
        ? {
            ruleId: 'PKG001',
            severity: 'warning',
            title: 'Package repository metadata is missing',
            message:
              'npm documents matching package repository metadata for GitHub publishing. Missing metadata can prevent provenance checks; this Action does not determine whether provenance is disabled.',
            expected: c.github.repository
              ? `https://github.com/${c.github.repository}`
              : 'The publishing GitHub repository URL',
            actual: 'No repository URL in package.json',
            fix: 'Add repository.url to the package.json being published, pointing to the publishing GitHub repository.',
          }
        : null,
  },
  {
    id: 'PKG002',
    check: (c) =>
      c.package.repositoryUrl &&
      c.github.repository &&
      c.package.normalizedRepository !== c.github.repository
        ? {
            ruleId: 'PKG002',
            severity: 'warning',
            title:
              'Package repository does not match the publishing repository',
            message:
              'npm documents matching repository metadata. This URL either identifies a different repository or is not a recognized GitHub URL; verify it before publishing, especially from a fork.',
            expected: c.github.repository,
            actual: c.package.repositoryUrl,
            fix: `Set repository.url to "https://github.com/${c.github.repository}.git" in the package being published. repository.directory may still identify a monorepo subdirectory.`,
          }
        : null,
  },
  {
    id: 'PKG003',
    check: (c) =>
      c.package.repositoryDirectory
        ? {
            ruleId: 'PKG003',
            severity: 'info',
            title: 'Monorepo package directory detected',
            message:
              'repository.directory locates the package within its repository. It does not change the Trusted Publisher repository identity.',
            expected: 'Repository identity remains owner/repository',
            actual: c.package.repositoryDirectory,
            fix: 'Run this Action with package-dir pointing to the package that npm publish will publish.',
          }
        : null,
  },
];
