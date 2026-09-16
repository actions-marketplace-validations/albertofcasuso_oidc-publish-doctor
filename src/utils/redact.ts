/** Credentials stay inside this collector-local sanitizer, never in the domain model. */
export class Redactor {
  private readonly secrets = new Set<string>();

  add(value: string | undefined): void {
    if (!value) return;
    this.secrets.add(value);
    this.secrets.add(encodeURIComponent(value));
  }

  text(value: string): string {
    let safe = value;
    for (const secret of [...this.secrets].sort(
      (a, b) => b.length - a.length,
    )) {
      safe = safe.split(secret).join('[REDACTED]');
    }
    return (
      safe
        .replace(
          /\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\b/g,
          '[REDACTED JWT]',
        )
        .replace(/\bnpm_[A-Za-z0-9]+\b/g, '[REDACTED]')
        .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi, '$1[REDACTED]@')
        .replace(/([?&])[^\s#]*/g, '$1[REDACTED]')
        .replace(
          /((?:_authToken|_auth|_password|password|username)\s*=)[^\r\n]*/gi,
          '$1[REDACTED]',
        )
        // Strip terminal controls intentionally; preserve line breaks for fixes.
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
        // Untrusted metadata must not inject workflow commands in console output.
        .replace(/::/g, ': :')
    );
  }

  sanitize<T>(value: T): T {
    if (typeof value === 'string') return this.text(value) as T;
    if (Array.isArray(value))
      return value.map((item: unknown) => this.sanitize(item)) as T;
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]: [string, unknown]) => [
          key,
          this.sanitize(item),
        ]),
      ) as T;
    }
    return value;
  }
}

export function redactEnvironment(
  env: NodeJS.ProcessEnv,
  redactor: Redactor,
): void {
  for (const [key, value] of Object.entries(env)) {
    if (/token|password|secret|credential|(?:^|_)auth(?:_|$)/i.test(key))
      redactor.add(value);
  }
}
