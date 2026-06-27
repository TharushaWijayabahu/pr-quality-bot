import {
  closeSync,
  constants,
  fstatSync,
  openSync,
  readSync,
  realpathSync,
  statSync,
} from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export interface ExistingFile {
  path: string;
  absolutePath: string;
  content: string;
}

const MAX_COVERAGE_REPORT_BYTES = 50 * 1024 * 1024;

function isPathWithin(parent: string, candidate: string): boolean {
  const relativePath = relative(parent, candidate);
  return (
    relativePath === '' ||
    (relativePath !== '..' && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
  );
}

export function isPathInsideWorkspace(path: string, workspace = process.cwd()): boolean {
  const absolutePath = resolve(workspace, path);
  const workspaceRoot = resolve(workspace);
  return isPathWithin(workspaceRoot, absolutePath);
}

export function readWorkspaceFile(
  path: string,
  workspace = process.cwd(),
  maxBytes = MAX_COVERAGE_REPORT_BYTES,
): ExistingFile | undefined {
  if (!isPathInsideWorkspace(path, workspace)) {
    throw new Error(`Path '${path}' must be inside the GitHub workspace.`);
  }

  const absolutePath = resolve(workspace, path);
  let descriptor: number;
  try {
    descriptor = openSync(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return undefined;
    if (code === 'ELOOP') {
      throw new Error(`Path '${path}' must not be a symbolic link.`);
    }
    throw error;
  }

  try {
    const stats = fstatSync(descriptor);
    if (!stats.isFile()) return undefined;

    let canonicalPath: string;
    try {
      canonicalPath = realpathSync(absolutePath);
    } catch {
      throw new Error(`Path '${path}' changed while it was being opened.`);
    }
    const workspaceRoot = realpathSync(workspace);
    if (!isPathWithin(workspaceRoot, canonicalPath)) {
      throw new Error(`Path '${path}' resolves outside the GitHub workspace.`);
    }
    const pathStats = statSync(canonicalPath);
    if (pathStats.dev !== stats.dev || pathStats.ino !== stats.ino) {
      throw new Error(`Path '${path}' changed while it was being opened.`);
    }

    if (stats.size > maxBytes) {
      throw new Error(
        `File '${path}' is too large to process (${stats.size} bytes; maximum ${maxBytes} bytes).`,
      );
    }

    const buffer = Buffer.allocUnsafe(stats.size);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const count = readSync(descriptor, buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (count === 0) break;
      bytesRead += count;
    }
    return {
      path,
      absolutePath: canonicalPath,
      content: buffer.subarray(0, bytesRead).toString('utf8'),
    };
  } finally {
    closeSync(descriptor);
  }
}

export function findFirstExistingFile(
  paths: string[],
  workspace = process.cwd(),
): ExistingFile | undefined {
  for (const path of paths) {
    const file = readWorkspaceFile(path, workspace);
    if (file) return file;
  }
  return undefined;
}

export function localFileSizeKb(path: string, workspace = process.cwd()): number | undefined {
  if (!isPathInsideWorkspace(path, workspace)) return undefined;
  try {
    const absolutePath = realpathSync(resolve(workspace, path));
    const workspaceRoot = realpathSync(workspace);
    if (!isPathWithin(workspaceRoot, absolutePath)) return undefined;
    const stats = statSync(absolutePath);
    return stats.isFile() ? stats.size / 1024 : undefined;
  } catch {
    return undefined;
  }
}
