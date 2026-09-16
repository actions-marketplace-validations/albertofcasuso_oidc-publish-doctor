import { describe, expect, it } from 'vitest';
import { resultFor, rules, runRules } from '../../src/rules/index.js';
import { happy, scenarios } from '../fixtures/contexts.js';

describe('diagnostic rules', () => {
  it('passes the happy path and has unique rule IDs', () => {
    expect(runRules(happy())).toEqual([]);
    expect(new Set(rules.map((r) => r.id)).size).toBe(rules.length);
  });
  it.each(Object.entries(scenarios))(
    '%s has a concrete diagnosis and fix',
    (_, scenario) => {
      const context = happy();
      scenario.change(context);
      const before = structuredClone(context);
      const issues = runRules(context);
      expect(issues.find((d) => d.ruleId === scenario.rule)).toMatchObject({
        severity: scenario.severity,
        expected: expect.any(String),
        actual: expect.any(String),
        title: expect.any(String),
        message: expect.any(String),
        fix: expect.any(String),
      });
      expect(context).toEqual(before);
    },
  );
  it('accepts exact documented minimums and rejects unavailable/invalid/prerelease versions', () => {
    const c = happy();
    c.nodeVersion = '22.14.0';
    c.npmVersion = '11.5.1';
    expect(runRules(c)).toEqual([]);
    for (const version of [undefined, 'not-semver', '11.5.1-rc.1']) {
      c.npmVersion = version;
      expect(runRules(c).map((d) => d.ruleId)).toContain('NPM001');
    }
  });
  it('does not compare omitted expected inputs or invent absent environment from failed OIDC', () => {
    const c = happy();
    c.expected = {};
    expect(runRules(c)).toEqual([]);
    c.expected.environment = 'production';
    c.oidc.status = 'unavailable';
    delete c.github.environment;
    expect(runRules(c).map((d) => d.ruleId)).toEqual(['OIDC001']);
  });
  it('uses the caller identity and avoids duplicate workflow errors', () => {
    const c = happy();
    scenarios['reusable/caller confusion']!.change(c);
    const issues = runRules(c);
    expect(issues.map((d) => d.ruleId)).toEqual(['PUB004', 'PUB005']);
    expect(issues[1]?.actual).toContain('Caller workflow: release.yml');
    c.expected.workflow = 'release.yml';
    expect(runRules(c).map((d) => d.ruleId)).toEqual(['PUB004']);
    c.github.jobWorkflowRef = c.github.workflowRef;
    expect(runRules(c)).toEqual([]);
  });
  it('does not infer registry intent from scoped/custom registries or block monorepos', () => {
    const c = happy();
    c.npm.registry = 'https://npm.example.com/';
    c.npm.scopedRegistry = 'https://npm.pkg.github.com/';
    c.package.publishRegistry = 'https://registry.npmjs.org/';
    c.package.repositoryDirectory = 'packages/core';
    expect(runRules(c).map((d) => d.ruleId)).toEqual(['PKG003']);
    expect(resultFor(runRules(c))).toBe('pass');
  });
  it('maps errors, warnings and informational findings to the output/exit policy', () => {
    const c = happy();
    c.npm.nodeAuthTokenPresent = true;
    expect(resultFor(runRules(c))).toBe('warn');
    expect(resultFor(runRules(c), true)).toBe('fail');
    c.expected.owner = 'wrong';
    expect(resultFor(runRules(c))).toBe('fail');
    expect(resultFor([])).toBe('pass');
  });
});
