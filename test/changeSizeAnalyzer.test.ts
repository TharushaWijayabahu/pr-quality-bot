import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyzeChangeSize } from '../src/analyzers/changeSizeAnalyzer';
import type { PullRequestFile } from '../src/models/types';

const files = JSON.parse(readFileSync('test/fixtures/pr-files.json', 'utf8')) as PullRequestFile[];

describe('analyzeChangeSize', () => {
  it('passes a small change without risky files', () => {
    expect(
      analyzeChangeSize([files[0]!], {
        maxFilesChanged: 5,
        maxAdditions: 50,
        maxDeletions: 50,
        largeFileThresholdKb: 500,
      }),
    ).toMatchObject({ passed: true, additions: 12, deletions: 2, riskPoints: 0 });
  });

  it('reports size thresholds and risky extensions', () => {
    const result = analyzeChangeSize(files, {
      maxFilesChanged: 1,
      maxAdditions: 10,
      maxDeletions: 2,
      largeFileThresholdKb: 500,
    });
    expect(result.passed).toBe(false);
    expect(result.riskyFiles).toEqual(['.github/workflows/deploy.yml']);
    expect(result.warnings).toHaveLength(4);
    expect(result.riskPoints).toBe(20);
  });

  it('flags an available local file over the threshold', () => {
    const result = analyzeChangeSize(
      [{ filename: 'test/fixtures/lcov.info', additions: 1, deletions: 0, changes: 1 }],
      { maxFilesChanged: 5, maxAdditions: 5, maxDeletions: 5, largeFileThresholdKb: 0 },
    );
    expect(result.largeFiles).toEqual(['test/fixtures/lcov.info']);
  });
});
