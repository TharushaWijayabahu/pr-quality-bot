import { describe, expect, it } from 'vitest';
import { analyzeCoverage } from '../src/analyzers/coverageAnalyzer';

const fixtures = 'test/fixtures';

describe('analyzeCoverage', () => {
  it.each([
    ['lcov.info', 80],
    ['jacoco.xml', 90],
    ['cobertura.xml', 76.5],
  ])('parses %s', (file, expected) => {
    expect(analyzeCoverage([`${fixtures}/${file}`], 70)).toMatchObject({
      passed: true,
      coverage: expected,
      reportPath: `${fixtures}/${file}`,
    });
  });

  it('fails below the configured minimum', () => {
    expect(analyzeCoverage([`${fixtures}/cobertura.xml`], 80)).toMatchObject({
      passed: false,
      warning: true,
      riskPoints: 25,
    });
  });

  it('warns without failing when no report exists', () => {
    expect(analyzeCoverage(['missing.xml'], 80)).toMatchObject({
      passed: true,
      warning: true,
      riskPoints: 0,
    });
  });

  it('skips enforcement when the minimum is zero', () => {
    expect(analyzeCoverage(['missing.xml'], 0)).toMatchObject({ passed: true, warning: false });
  });

  it('rejects XML entity declarations', () => {
    const result = analyzeCoverage([`${fixtures}/entity.xml`], 80);
    expect(result).toMatchObject({ passed: true, warning: true, riskPoints: 0 });
  });
});
