import * as core from '@actions/core';
import { mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config';

vi.mock('@actions/core', () => ({
  getInput: vi.fn(),
}));

const getInputMock = vi.mocked(core.getInput);

function setupInputs(inputs: Record<string, string>): void {
  getInputMock.mockImplementation((name: string) => inputs[name] ?? '');
}

describe('loadConfig', () => {
  it('throws when config-path points outside the workspace', () => {
    setupInputs({ 'config-path': '../outside.yml' });
    expect(() => loadConfig('/home/runner/work/repo')).toThrow(
      "Input 'config-path' must point to a file inside the GitHub workspace.",
    );
  });

  it('throws when coverage-report-paths includes an outside workspace path', () => {
    setupInputs({ 'coverage-report-paths': '../outside/coverage.info' });
    expect(() => loadConfig('/home/runner/work/repo')).toThrow(
      "Input 'coverage-report-paths' must only include files inside the GitHub workspace.",
    );
  });

  it('rejects a config symlink that resolves outside the workspace', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'pr-quality-workspace-'));
    const outside = join(tmpdir(), `pr-quality-outside-${Date.now()}.yml`);
    writeFileSync(outside, 'coverage:\n  min: 0\n');
    symlinkSync(outside, join(workspace, 'config.yml'));
    setupInputs({ 'config-path': 'config.yml' });

    expect(() => loadConfig(workspace)).toThrow('resolves outside the GitHub workspace');
  });

  it('rejects regular expressions with unsafe backtracking', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'pr-quality-workspace-'));
    writeFileSync(join(workspace, 'config.yml'), "title:\n  regex: '(a+)+$'\n");
    setupInputs({ 'config-path': 'config.yml' });

    expect(() => loadConfig(workspace)).toThrow('pattern may cause catastrophic backtracking');
  });

  it('rejects comment markers that are not namespaced', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'pr-quality-workspace-'));
    writeFileSync(join(workspace, 'config.yml'), "comment:\n  marker: '<!-- comment -->'\n");
    setupInputs({ 'config-path': 'config.yml' });

    expect(() => loadConfig(workspace)).toThrow('namespaced HTML comment');
  });
});
