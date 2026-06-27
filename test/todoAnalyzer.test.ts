import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyzeTodos } from '../src/analyzers/todoAnalyzer';
import type { PullRequestFile } from '../src/models/types';

const files = JSON.parse(readFileSync('test/fixtures/pr-files.json', 'utf8')) as PullRequestFile[];

describe('analyzeTodos', () => {
  it('only flags keywords in added patch lines', () => {
    const result = analyzeTodos(files, 0, ['TODO', 'FIXME', 'HACK']);
    expect(result).toMatchObject({ passed: false, count: 1, riskPoints: 20 });
    expect(result.findings[0]).toMatchObject({ path: 'src/service.ts', keyword: 'TODO' });
  });

  it('passes when findings remain within the configured maximum', () => {
    expect(analyzeTodos(files, 1, ['TODO'])).toMatchObject({
      passed: true,
      count: 1,
      riskPoints: 0,
    });
  });

  it('does not scan files without patch data', () => {
    expect(
      analyzeTodos([{ filename: 'src/a.ts', additions: 1, deletions: 0, changes: 1 }], 0, ['TODO']),
    ).toMatchObject({ passed: true, count: 0 });
  });
});
