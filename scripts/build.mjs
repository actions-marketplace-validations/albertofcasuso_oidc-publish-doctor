import { build } from 'esbuild';
import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative } from 'node:path';
import process from 'node:process';

const result = await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  // Bundled CommonJS dependencies may require Node builtins at runtime.
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  legalComments: 'eof',
  write: false,
  metafile: true,
});

// Include dependency license texts in the distributed artifact.
const packageDirs = new Set(
  Object.keys(result.metafile.inputs).flatMap((file) => {
    const match = file.match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//);
    return match?.[1] ? [match[1]] : [];
  }),
);
const licenses = [];
for (const dir of [...packageDirs].sort()) {
  const pkg = JSON.parse(await readFile(`${dir}/package.json`, 'utf8'));
  let license;
  for (const filename of [
    'LICENSE',
    'LICENSE.md',
    'LICENSE.txt',
    'license',
    'license.md',
  ]) {
    try {
      license = await readFile(`${dir}/${filename}`, 'utf8');
      break;
    } catch {
      /* Try next name. */
    }
  }
  if (!license)
    throw new Error(`Missing license text for bundled dependency ${pkg.name}`);
  licenses.push(`${pkg.name}@${pkg.version}\n${license.trim()}\n`);
}
const files = new Map(
  result.outputFiles.map((file) => [
    relative(process.cwd(), file.path),
    file.contents,
  ]),
);
files.set('dist/licenses.txt', Buffer.from(licenses.join('\n---\n\n')));
for (const [path, contents] of files) {
  if (process.argv.includes('--check')) {
    let current;
    try {
      current = await readFile(path);
    } catch {
      /* Missing bundle also fails. */
    }
    if (!current || !current.equals(Buffer.from(contents))) {
      throw new Error(
        `${path} is stale or missing. Run npm run build and commit dist/.`,
      );
    }
  } else {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents);
  }
}
