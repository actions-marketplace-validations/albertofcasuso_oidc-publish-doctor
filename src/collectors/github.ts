import type { DiagnosticContext } from '../types.js';
import type { OidcClaims } from '../utils/jwt.js';
import { workflowFilename } from '../utils/github-repository.js';

export function collectGithub(
  claims: OidcClaims,
  env: NodeJS.ProcessEnv,
  oidcAvailable: boolean,
): DiagnosticContext['github'] {
  const repository = claims.repository ?? env.GITHUB_REPOSITORY;
  const workflowRef = claims.workflow_ref ?? env.GITHUB_WORKFLOW_REF;
  return {
    repository,
    owner:
      claims.repository_owner ??
      repository?.split('/')[0] ??
      env.GITHUB_REPOSITORY_OWNER,
    workflowRef,
    jobWorkflowRef: claims.job_workflow_ref,
    workflowFilename: workflowFilename(workflowRef),
    reusableWorkflowFilename: workflowFilename(claims.job_workflow_ref),
    // Do not infer environment from sub: GitHub supports custom subject templates.
    environment: claims.environment,
    runnerEnvironment: claims.runner_environment ?? env.RUNNER_ENVIRONMENT,
    ref: claims.ref ?? env.GITHUB_REF,
    eventName: claims.event_name ?? env.GITHUB_EVENT_NAME,
    identitySource: oidcAvailable ? 'oidc' : 'environment',
  };
}
