import * as core from '@actions/core';
import { mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { defaultConfig, loadConfig } from '../src/config';

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
    const outsideDirectory = mkdtempSync(join(tmpdir(), 'pr-quality-outside-'));
    const outside = join(outsideDirectory, 'config.yml');
    writeFileSync(outside, 'coverage:\n  min: 0\n');
    symlinkSync(outside, join(workspace, 'config.yml'));
    setupInputs({ 'config-path': 'config.yml' });

    expect(() => loadConfig(workspace)).toThrow('must not be a symbolic link');
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

  it('allows missing config files and uses defaults', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'pr-quality-workspace-'));
    setupInputs({});

    const config = loadConfig(workspace);

    expect(config).toMatchObject(defaultConfig);
  });

  it('lets workflow inputs override the config file values', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'pr-quality-workspace-'));
    writeFileSync(join(workspace, 'config.yml'), 'coverage:\n  min: 90\n');
    setupInputs({ 'config-path': 'config.yml', 'min-coverage': '75', 'fail-on-risk': 'medium' });

    const config = loadConfig(workspace);

    expect(config.coverage.min).toBe(75);
    expect(config.risk.failOn).toBe('medium');
  });

  it('rejects invalid numeric thresholds', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'pr-quality-workspace-'));
    writeFileSync(join(workspace, 'config.yml'), 'changeSize:\n  maxAdditions: -2\n');
    setupInputs({ 'config-path': 'config.yml' });

    expect(() => loadConfig(workspace)).toThrow('non-negative number');
  });
});
