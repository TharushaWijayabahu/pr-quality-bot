import { mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isPathInsideWorkspace, readWorkspaceFile } from '../src/utils/fileUtils';

describe('workspace file safety', () => {
  it('rejects lexical path traversal', () => {
    expect(isPathInsideWorkspace('../secret', '/workspace/repository')).toBe(false);
  });

  it('reads regular files inside the workspace', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'pr-quality-workspace-'));
    writeFileSync(join(workspace, 'report.info'), 'LF:1\nLH:1\n');

    expect(readWorkspaceFile('report.info', workspace)).toMatchObject({
      path: 'report.info',
      content: 'LF:1\nLH:1\n',
    });
  });

  it('rejects symlinks that resolve outside the workspace', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'pr-quality-workspace-'));
    const outside = join(tmpdir(), `pr-quality-report-${Date.now()}.info`);
    writeFileSync(outside, 'LF:1\nLH:1\n');
    symlinkSync(outside, join(workspace, 'report.info'));

    expect(() => readWorkspaceFile('report.info', workspace)).toThrow(
      'resolves outside the GitHub workspace',
    );
  });

  it('rejects files larger than the configured processing limit', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'pr-quality-workspace-'));
    writeFileSync(join(workspace, 'report.info'), 'LF:1\nLH:1\n');

    expect(() => readWorkspaceFile('report.info', workspace, 2)).toThrow('is too large to process');
  });
});
