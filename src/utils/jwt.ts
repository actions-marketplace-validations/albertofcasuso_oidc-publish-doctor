export const claimNames = [
  'repository',
  'repository_owner',
  'workflow_ref',
  'job_workflow_ref',
  'environment',
  'runner_environment',
  'ref',
  'event_name',
] as const;
export type OidcClaims = Partial<Record<(typeof claimNames)[number], string>>;

/** Inspection only. This does not verify a JWT signature or authorize anything. */
export function decodeClaims(token: string): OidcClaims | undefined {
  try {
    const parts = token.split('.');
    const payload = parts[1];
    if (
      parts.length !== 3 ||
      !payload ||
      token.length > 65536 ||
      !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))
    )
      return undefined;
    const decoded: unknown = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded))
      return undefined;
    const record = decoded as Record<string, unknown>;
    const claims: OidcClaims = {};
    for (const name of claimNames) {
      const value = record[name];
      if (typeof value === 'string' && value.length > 0 && value.length <= 2048)
        claims[name] = value;
    }
    return claims;
  } catch {
    // Parse errors can include pieces of the token. Never forward their messages.
    return undefined;
  }
}
