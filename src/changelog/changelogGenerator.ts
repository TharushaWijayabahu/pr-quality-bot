import * as github from '@actions/github';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

interface ChangelogPullRequest {
  number: number;
  title: string;
  author: string;
  mergedAt: string;
}

const sections: Array<[RegExp, string]> = [
  [/^feat(?:\(.+\))?!?:/iu, 'Features'],
  [/^fix(?:\(.+\))?!?:/iu, 'Fixes'],
  [/^docs(?:\(.+\))?!?:/iu, 'Documentation'],
  [/^refactor(?:\(.+\))?!?:/iu, 'Refactoring'],
  [/^perf(?:\(.+\))?!?:/iu, 'Performance'],
  [/^test(?:\(.+\))?!?:/iu, 'Tests'],
  [/^(?:chore|build|ci)(?:\(.+\))?!?:/iu, 'Maintenance'],
];

function gitOutput(args: string[], fallback: string): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim() || fallback;
  } catch {
    return fallback;
  }
}

export function renderChangelog(
  version: string,
  date: string,
  pulls: ChangelogPullRequest[],
): string {
  const grouped = new Map<string, ChangelogPullRequest[]>();
  for (const pull of pulls) {
    const section = sections.find(([pattern]) => pattern.test(pull.title))?.[1] ?? 'Other';
    grouped.set(section, [...(grouped.get(section) ?? []), pull]);
  }
  const orderedSections = [...sections.map(([, name]) => name), 'Other'];
  const content = orderedSections
    .filter((section) => grouped.has(section))
    .map((section) => {
      const entries = grouped
        .get(section)
        ?.map((pull) => `- ${pull.title} (#${pull.number}) by @${pull.author}`)
        .join('\n');
      return `### ${section}\n\n${entries}`;
    })
    .join('\n\n');
  return `## ${version} - ${date}\n\n${content || '_No merged pull requests found._'}\n`;
}

export async function generateChangelog(): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository?.includes('/')) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required.');
  }
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);

  const lastTag = gitOutput(['describe', '--tags', '--abbrev=0'], '');
  const since = lastTag
    ? gitOutput(['log', '-1', '--format=%cI', lastTag], '1970-01-01T00:00:00Z')
    : '1970-01-01T00:00:00Z';
  const version = process.env.CHANGELOG_VERSION || lastTag || 'Unreleased';
  const client = github.getOctokit(token);
  const closedPulls = await client.paginate(client.rest.pulls.list, {
    owner,
    repo,
    state: 'closed',
    sort: 'updated',
    direction: 'desc',
    per_page: 100,
  });
  const pulls: ChangelogPullRequest[] = closedPulls
    .filter((pull) => pull.merged_at && pull.merged_at > since)
    .map((pull) => ({
      number: pull.number,
      title: pull.title,
      author: pull.user?.login ?? 'ghost',
      mergedAt: pull.merged_at as string,
    }))
    .sort((a, b) => a.mergedAt.localeCompare(b.mergedAt));

  const date = new Date().toISOString().slice(0, 10);
  const generated = renderChangelog(version, date, pulls);
  const path = 'CHANGELOG.md';
  const existing = readFileSync(path, 'utf8');
  const heading = '# Changelog\n';
  const body = existing.startsWith(heading) ? existing.slice(heading.length).trimStart() : existing;
  writeFileSync(path, `${heading}\n${generated}\n${body}`.trimEnd() + '\n');
  process.stdout.write(
    `Generated ${version} changelog with ${pulls.length} merged pull requests.\n`,
  );
}

if (require.main === module) {
  generateChangelog().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
