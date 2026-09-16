import { decodeClaims, type OidcClaims } from '../utils/jwt.js';
import type { DiagnosticContext } from '../types.js';
import type { Redactor } from '../utils/redact.js';

export async function collectOidc(
  getToken: () => Promise<string>,
  redactor: Redactor,
): Promise<{
  status: DiagnosticContext['oidc']['status'];
  claims: OidcClaims;
}> {
  try {
    const token = await getToken();
    redactor.add(token);
    const claims = decodeClaims(token);
    return claims
      ? { status: 'available', claims }
      : { status: 'invalid', claims: {} };
  } catch {
    return { status: 'unavailable', claims: {} };
  }
}
