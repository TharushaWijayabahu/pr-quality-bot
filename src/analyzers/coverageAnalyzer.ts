import type { CoverageResult } from '../models/types';
import { findFirstExistingFile } from '../utils/fileUtils';
import { parseCoverageReport } from '../utils/parseCoverage';

export function analyzeCoverage(
  paths: string[],
  minimum: number,
  riskPoints = 25,
  workspace = process.cwd(),
): CoverageResult {
  if (minimum === 0) {
    return {
      name: 'coverage',
      passed: true,
      warning: false,
      minimum,
      message: 'Coverage enforcement is disabled.',
      riskPoints: 0,
    };
  }

  const report = findFirstExistingFile(paths, workspace);
  if (!report) {
    return {
      name: 'coverage',
      passed: true,
      warning: true,
      minimum,
      message: `No coverage report found in: ${paths.join(', ')}.`,
      riskPoints: 0,
    };
  }

  try {
    const coverage = parseCoverageReport(report.path, report.content);
    const passed = coverage >= minimum;
    return {
      name: 'coverage',
      passed,
      warning: !passed,
      coverage,
      minimum,
      reportPath: report.path,
      message: passed
        ? `Line coverage is ${coverage}% (minimum ${minimum}%).`
        : `Line coverage is ${coverage}%, below the required ${minimum}%.`,
      riskPoints: passed ? 0 : riskPoints,
    };
  } catch (error) {
    return {
      name: 'coverage',
      passed: true,
      warning: true,
      minimum,
      reportPath: report.path,
      message: `Could not parse ${report.path}: ${error instanceof Error ? error.message : String(error)}`,
      riskPoints: 0,
    };
  }
}
