export type DiagnosticSeverity = 'error' | 'warning' | 'info';
export type Result = 'pass' | 'warn' | 'fail';

export interface Diagnostic {
  ruleId: string;
  severity: DiagnosticSeverity;
  title: string;
  message: string;
  expected?: string;
  actual?: string;
  fix?: string;
  likelySymptoms?: string[];
}

export interface DiagnosticContext {
  /** Publishing tools resolved from PATH, not the JavaScript Action runtime. */
  nodeVersion?: string;
  npmVersion?: string;
  oidc: { status: 'available' | 'unavailable' | 'invalid' };
  github: {
    repository?: string;
    owner?: string;
    workflowRef?: string;
    jobWorkflowRef?: string;
    workflowFilename?: string;
    reusableWorkflowFilename?: string;
    environment?: string;
    runnerEnvironment?: string;
    ref?: string;
    eventName?: string;
    identitySource: 'oidc' | 'environment';
  };
  package: {
    status: 'read' | 'unreadable' | 'invalid';
    name?: string;
    repositoryUrl?: string;
    normalizedRepository?: string;
    repositoryDirectory?: string;
    publishRegistry?: string;
  };
  npm: {
    /** Observations only: a future publish command can override these. */
    registry?: string;
    scopedRegistry?: string;
    nodeAuthTokenPresent: boolean;
    authConfigurationDetected: boolean;
    configInspectionIncomplete: boolean;
  };
  expected: {
    owner?: string;
    repository?: string;
    workflow?: string;
    environment?: string;
  };
}

export interface Rule {
  id: string;
  check(context: DiagnosticContext): Diagnostic | Diagnostic[] | null;
}

export interface ActionInputs {
  packageDir: string;
  expected: DiagnosticContext['expected'];
  failOnWarning: boolean;
}
