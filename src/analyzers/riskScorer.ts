import type { AnalyzerResult, FailOnRisk, RiskLevel, RiskResult } from '../models/types';

export function riskLevel(score: number): RiskLevel {
  if (score >= 70) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

export function shouldFail(level: RiskLevel, failOn: FailOnRisk): boolean {
  if (failOn === 'none') return false;
  if (failOn === 'medium') return level === 'medium' || level === 'high';
  return level === 'high';
}

export function scoreRisk(results: AnalyzerResult[], failOn: FailOnRisk = 'high'): RiskResult {
  const score = Math.min(
    100,
    Math.max(
      0,
      results.reduce((total, result) => total + result.riskPoints, 0),
    ),
  );
  const level = riskLevel(score);
  return {
    score,
    level,
    passed: !shouldFail(level, failOn),
    failedChecks: results
      .filter((result) => !result.passed && !result.warning)
      .map((result) => result.name),
    warningChecks: results.filter((result) => result.warning).map((result) => result.name),
  };
}
