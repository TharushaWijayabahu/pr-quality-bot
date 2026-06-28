import type { GitHubClient } from '../githubClient';
import { logger } from '../utils/logger';

interface ExistingComment {
  body?: string | null;
  user?: { login?: string; type?: string } | null;
}

function hasReportMarker(comment: ExistingComment, marker: string): boolean {
  return comment.body === marker || Boolean(comment.body?.startsWith(`${marker}\n`));
}

function isTrustedBotComment(comment: ExistingComment): boolean {
  const login = comment.user?.login ?? '';
  return (
    comment.user?.type === 'Bot' && (login === 'github-actions[bot]' || login.endsWith('[bot]'))
  );
}

function errorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  return typeof error.status === 'number' ? error.status : undefined;
}

export async function publishComment(
  client: GitHubClient,
  owner: string,
  repo: string,
  issueNumber: number,
  marker: string,
  body: string,
): Promise<'created' | 'updated'> {
  const comments = await client.paginate(client.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  const existing = comments.find(
    (comment) => hasReportMarker(comment, marker) && isTrustedBotComment(comment),
  );
  if (existing) {
    try {
      await client.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
      return 'updated';
    } catch (error) {
      const status = errorStatus(error);
      if (status !== 403 && status !== 404 && status !== 422) throw error;
      logger.warning(
        `Could not update the existing report comment (HTTP ${status}); creating a new comment.`,
      );
    }
  }
  await client.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body });
  return 'created';
}
