import { describe, expect, it, vi } from 'vitest';
import type { GitHubClient } from '../src/githubClient';
import { publishComment } from '../src/comment/commentPublisher';

function clientWithComments(comments: Array<{ id: number; body: string }>) {
  const updateComment = vi.fn().mockResolvedValue({});
  const createComment = vi.fn().mockResolvedValue({});
  const client = {
    paginate: vi.fn().mockResolvedValue(comments),
    rest: { issues: { listComments: vi.fn(), updateComment, createComment } },
  } as unknown as GitHubClient;
  return { client, updateComment, createComment };
}

describe('publishComment', () => {
  const marker = '<!-- pr-quality-bot-comment -->';

  it('updates a report whose first line is the exact marker', async () => {
    const { client, updateComment, createComment } = clientWithComments([
      { id: 42, body: `${marker}\n\nOld report` },
    ]);

    await expect(publishComment(client, 'owner', 'repo', 7, marker, 'New report')).resolves.toBe(
      'updated',
    );
    expect(updateComment).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      comment_id: 42,
      body: 'New report',
    });
    expect(createComment).not.toHaveBeenCalled();
  });

  it('does not overwrite an unrelated comment containing the marker', async () => {
    const { client, updateComment, createComment } = clientWithComments([
      { id: 42, body: `Discussion text ${marker}` },
    ]);

    await expect(publishComment(client, 'owner', 'repo', 7, marker, 'New report')).resolves.toBe(
      'created',
    );
    expect(updateComment).not.toHaveBeenCalled();
    expect(createComment).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      issue_number: 7,
      body: 'New report',
    });
  });
});
