import { describe, expect, it } from 'vitest';
import { scoreRisk } from '../src/analyzers/riskScorer';
import type { AnalyzerResult } from '../src/models/types';

function result(points: number, passed = points === 0): AnalyzerResult {
  return {
    name: 'title',
    passed,
    warning: false,
    message: 'test',
    actual: 'test',
    expected: 'test',
    riskPoints: points,
  };
}

describe('scoreRisk', () => {
  it.each([
    [29, 'low'],
    [30, 'medium'],
    [69, 'medium'],
    [70, 'high'],
  ])('maps score %i to %s', (score, level) => {
    expect(scoreRisk([result(score)])).toMatchObject({ score, level });
  });

  it('caps the score at 100', () => {
    expect(scoreRisk([result(75), result(75)])).toMatchObject({ score: 100, level: 'high' });
  });

  it('honors medium and none failure thresholds', () => {
    expect(scoreRisk([result(30)], 'medium').passed).toBe(false);
    expect(scoreRisk([result(100)], 'none').passed).toBe(true);
  });
});
