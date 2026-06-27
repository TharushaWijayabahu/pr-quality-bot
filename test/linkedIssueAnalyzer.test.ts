import { describe, expect, it } from 'vitest';
import { analyzeLinkedIssue } from '../src/analyzers/linkedIssueAnalyzer';
import { defaultConfig } from '../src/config';

describe('analyzeLinkedIssue', () => {
  it.each(['Fixes #123', 'Closes #45', 'Resolves #9', '#321', 'ABC-123'])(
    'finds reference %s',
    (reference) => {
      expect(
        analyzeLinkedIssue(
          'feat: add a useful capability',
          reference,
          true,
          defaultConfig.linkedIssue.regex,
        ),
      ).toMatchObject({ passed: true, matchedReference: reference });
    },
  );

  it('fails when a required reference is absent', () => {
    expect(
      analyzeLinkedIssue('fix: handle missing account', '', true, defaultConfig.linkedIssue.regex),
    ).toMatchObject({ passed: false, riskPoints: 15 });
  });

  it('passes when the check is disabled', () => {
    expect(
      analyzeLinkedIssue('anything', '', false, defaultConfig.linkedIssue.regex),
    ).toMatchObject({
      passed: true,
      riskPoints: 0,
    });
  });
});
