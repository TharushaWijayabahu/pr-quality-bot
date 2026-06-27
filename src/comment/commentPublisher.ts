import type { GitHubClient } from '../githubClient';

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
    (comment) => comment.body === marker || comment.body?.startsWith(`${marker}\n`),
  );
  if (existing) {
    await client.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
    return 'updated';
  }
  await client.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body });
  return 'created';
}
