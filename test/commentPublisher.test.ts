import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitHubClient } from '../src/githubClient';
import { publishComment } from '../src/comment/commentPublisher';
import { logger } from '../src/utils/logger';

vi.mock('../src/utils/logger', () => ({
  logger: { warning: vi.fn() },
}));

interface MockComment {
  id: number;
  body: string;
  user?: { login: string; type: string };
}

function clientWithComments(comments: MockComment[]) {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates a report whose first line is the exact marker', async () => {
    const { client, updateComment, createComment } = clientWithComments([
      {
        id: 42,
        body: `${marker}\n\nOld report`,
        user: { login: 'github-actions[bot]', type: 'Bot' },
      },
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

  it('creates a new comment when the marker is missing', async () => {
    const { client, updateComment, createComment } = clientWithComments([
      { id: 1, body: 'Other comment' },
    ]);

    await expect(publishComment(client, 'owner', 'repo', 7, marker, 'New report')).resolves.toBe(
      'created',
    );
    expect(createComment).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      issue_number: 7,
      body: 'New report',
    });
    expect(updateComment).not.toHaveBeenCalled();
  });

  it('ignores a marker pre-seeded by a normal user', async () => {
    const { client, updateComment, createComment } = clientWithComments([
      {
        id: 7,
        body: `${marker}\n\nFake report`,
        user: { login: 'attacker', type: 'User' },
      },
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

  it('creates a replacement when updating a trusted bot comment is no longer allowed', async () => {
    const { client, updateComment, createComment } = clientWithComments([
      {
        id: 42,
        body: `${marker}\n\nOld report`,
        user: { login: 'github-actions[bot]', type: 'Bot' },
      },
    ]);
    updateComment.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }));

    await expect(publishComment(client, 'owner', 'repo', 7, marker, 'New report')).resolves.toBe(
      'created',
    );
    expect(createComment).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      issue_number: 7,
      body: 'New report',
    });
    expect(logger.warning).toHaveBeenCalledWith(
      'Could not update the existing report comment (HTTP 403); creating a new comment.',
    );
  });
});
