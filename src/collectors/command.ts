import { getExecOutput } from '@actions/exec';

export type Command = (
  tool: string,
  args: string[],
  cwd: string,
) => Promise<string | undefined>;

export const runCommand: Command = async (tool, args, cwd) => {
  try {
    const result = await getExecOutput(tool, args, {
      cwd,
      silent: true,
      ignoreReturnCode: true,
    });
    return result.exitCode === 0 ? result.stdout.trim() : undefined;
  } catch {
    // stderr and exception messages can contain npm credentials or configuration.
    return undefined;
  }
};
