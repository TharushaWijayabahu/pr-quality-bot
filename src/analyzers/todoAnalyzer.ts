import type { PullRequestFile, TodoFinding, TodoResult } from '../models/types';

export function analyzeTodos(
  files: PullRequestFile[],
  maximum: number,
  keywords: string[],
  riskPoints = 20,
): TodoResult {
  const findings: TodoFinding[] = [];
  const keywordPattern = new RegExp(`\\b(${keywords.map(escapeRegex).join('|')})\\b`, 'i');

  for (const file of files) {
    for (const line of file.patch?.split(/\r?\n/u) ?? []) {
      if (!line.startsWith('+') || line.startsWith('+++')) continue;
      const addedLine = line.slice(1);
      const match = addedLine.match(keywordPattern);
      if (match?.[1]) {
        findings.push({
          path: file.filename,
          line: addedLine.trim(),
          keyword: match[1].toUpperCase(),
        });
      }
    }
  }

  const passed = findings.length <= maximum;
  return {
    name: 'todo',
    passed,
    warning: false,
    count: findings.length,
    findings,
    message: passed
      ? findings.length === 0
        ? 'No new TODO/FIXME/HACK comments.'
        : `${findings.length} finding(s), within the configured maximum of ${maximum}.`
      : `${findings.length} new TODO/FIXME/HACK comments (maximum ${maximum}).`,
    riskPoints: passed ? 0 : riskPoints,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
