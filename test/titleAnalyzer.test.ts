import { describe, expect, it } from 'vitest';
import { analyzeTitle } from '../src/analyzers/titleAnalyzer';
import { defaultConfig } from '../src/config';

describe('analyzeTitle', () => {
  it.each([
    'feat(auth): add refresh token rotation',
    'fix(api): handle null customer profile',
    'docs(readme): improve setup guide',
  ])('accepts a conventional title: %s', (title) => {
    expect(analyzeTitle(title, defaultConfig.title.regex)).toMatchObject({
      passed: true,
      riskPoints: 0,
    });
  });

  it.each(['update code', 'bug fix', 'changes'])('rejects an invalid title: %s', (title) => {
    expect(analyzeTitle(title, defaultConfig.title.regex)).toMatchObject({
      passed: false,
      riskPoints: 15,
      actual: title,
    });
  });
});
