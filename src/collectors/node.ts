import { valid } from 'semver';
import { runCommand, type Command } from './command.js';

export async function collectVersions(
  cwd: string,
  command: Command = runCommand,
) {
  const [node, npm] = await Promise.all([
    command('node', ['--version'], cwd),
    command('npm', ['--version'], cwd),
  ]);
  return {
    nodeVersion: node ? (valid(node) ?? undefined) : undefined,
    npmVersion: npm ? (valid(npm) ?? undefined) : undefined,
  };
}
