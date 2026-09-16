/** Normalize only recognized GitHub URLs, never arbitrary hosts or nested paths. */
export function normalizeGithubRepository(value: string): string | undefined {
  const input = value.trim();
  let path: string;
  if (input.startsWith('github:')) {
    path = input.slice(7);
  } else if (input.startsWith('git@github.com:')) {
    path = input.slice(15);
  } else {
    try {
      const url = new URL(input.replace(/^git\+/, ''));
      if (
        url.hostname.toLowerCase() !== 'github.com' ||
        !['https:', 'http:', 'git:', 'ssh:'].includes(url.protocol) ||
        url.port ||
        url.search ||
        url.hash
      )
        return undefined;
      path = url.pathname.replace(/^\//, '');
    } catch {
      return undefined;
    }
  }
  path = path.replace(/\/$/, '').replace(/\.git$/, '');
  return /^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(path) ? path : undefined;
}

export function workflowFilename(ref: string | undefined): string | undefined {
  return ref?.match(
    /^[^/]+\/[^/]+\/\.github\/workflows\/([^/@]+\.ya?ml)@.+$/,
  )?.[1];
}
