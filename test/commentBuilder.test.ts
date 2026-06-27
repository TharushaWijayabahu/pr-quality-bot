import { describe, expect, it } from 'vitest';
import { analyzeChangeSize } from '../src/analyzers/changeSizeAnalyzer';
import { analyzeCoverage } from '../src/analyzers/coverageAnalyzer';
import { analyzeLinkedIssue } from '../src/analyzers/linkedIssueAnalyzer';
import { scoreRisk } from '../src/analyzers/riskScorer';
import { analyzeTitle } from '../src/analyzers/titleAnalyzer';
import { analyzeTodos } from '../src/analyzers/todoAnalyzer';
import { buildComment } from '../src/comment/commentBuilder';
import { defaultConfig } from '../src/config';

describe('buildComment', () => {
  it('renders the marker, score, checks, and recommendation', () => {
    const title = analyzeTitle(
      'feat(api): add customer search endpoint',
      defaultConfig.title.regex,
    );
    const linkedIssue = analyzeLinkedIssue('', 'Fixes #123', true, defaultConfig.linkedIssue.regex);
    const coverage = analyzeCoverage(['test/fixtures/cobertura.xml'], 80);
    const changeSize = analyzeChangeSize([], defaultConfig.changeSize);
    const todo = analyzeTodos([], 0, defaultConfig.todo.keywords);
    const risk = scoreRisk([title, linkedIssue, coverage, changeSize, todo]);
    const comment = buildComment(
      { title, linkedIssue, coverage, changeSize, todo, risk },
      '<!-- marker -->',
    );

    expect(comment).toContain('<!-- marker -->');
    expect(comment).toContain('## PR Quality Bot Report');
    expect(comment).toContain('Risk score: 25 / 100');
    expect(comment).toContain('| Coverage | ⚠️ Warning | 76.5%, required 80%');
    expect(comment).toContain('This PR looks safe from the configured quality checks.');
  });

  it('neutralizes HTML and mentions from pull request content', () => {
    const title = analyzeTitle('<details>@maintainer</details>', '.*');
    const linkedIssue = analyzeLinkedIssue('', 'Fixes #123', true, defaultConfig.linkedIssue.regex);
    const coverage = analyzeCoverage([], 0);
    const changeSize = analyzeChangeSize([], defaultConfig.changeSize);
    const todo = analyzeTodos([], 0, defaultConfig.todo.keywords);
    const risk = scoreRisk([title, linkedIssue, coverage, changeSize, todo]);

    const comment = buildComment(
      { title, linkedIssue, coverage, changeSize, todo, risk },
      '<!-- pr-quality-bot-comment -->',
    );

    expect(comment).toContain('&lt;details&gt;&#64;maintainer&lt;/details&gt;');
    expect(comment).not.toContain('<details>@maintainer</details>');
  });
});
