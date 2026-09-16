import { gte, valid } from 'semver';
import type { DiagnosticContext, Rule } from '../types.js';

// Verified 2026-09-16: https://docs.npmjs.com/trusted-publishers/
export const MIN_NPM = '11.5.1';
export const MIN_NODE = '22.14.0';

function versionRule(
  id: string,
  tool: string,
  minimum: string,
  key: 'nodeVersion' | 'npmVersion',
  fix: string,
): Rule {
  return {
    id,
    check(context: DiagnosticContext) {
      const version = context[key];
      if (version && valid(version) && gte(version, minimum)) return null;
      return {
        ruleId: id,
        severity: 'error',
        title: `${tool} version is unsupported or could not be read`,
        message: `npm documents ${tool} >= ${minimum} for Trusted Publishing. This checks the publishing tool on PATH, independently of the Action runtime.`,
        expected: `>= ${minimum}`,
        actual: version ?? 'unavailable',
        fix,
      };
    },
  };
}

export const runtimeRules = [
  versionRule(
    'NPM001',
    'npm',
    MIN_NPM,
    'npmVersion',
    'Install npm >= 11.5.1 before this step (npm install --global npm@latest), then verify npm --version in the publish job.',
  ),
  versionRule(
    'NODE001',
    'Node',
    MIN_NODE,
    'nodeVersion',
    'Use actions/setup-node with node-version: "24" before this step, then verify node --version in the publish job.',
  ),
];
