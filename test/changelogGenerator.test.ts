import { describe, expect, it } from 'vitest';
import { renderChangelog } from '../src/changelog/changelogGenerator';

describe('renderChangelog', () => {
  it('groups conventional PR titles and includes number and author', () => {
    const changelog = renderChangelog('v1.2.0', '2026-06-27', [
      {
        number: 45,
        title: 'feat(auth): add token rotation',
        author: 'developer',
        mergedAt: '2026-06-26T01:00:00Z',
      },
      {
        number: 46,
        title: 'fix(parser): handle missing lcov file',
        author: 'maintainer',
        mergedAt: '2026-06-26T02:00:00Z',
      },
    ]);

    expect(changelog).toContain('## v1.2.0 - 2026-06-27');
    expect(changelog).toContain('### Features');
    expect(changelog).toContain('- feat(auth): add token rotation (#45) by @developer');
    expect(changelog).toContain('### Fixes');
  });
});
