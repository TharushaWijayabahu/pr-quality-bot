import * as github from '@actions/github';
import type { PullRequestDetails, PullRequestFile } from './models/types';

export type GitHubClient = ReturnType<typeof github.getOctokit>;

export function createGitHubClient(token: string): GitHubClient {
  if (!token.trim()) throw new Error("Input 'github-token' is required to read pull request data.");
  return github.getOctokit(token);
}

export function getPullRequestDetails(): PullRequestDetails {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    throw new Error('PR Quality Bot must run for a pull_request event. No pull request was found.');
  }
  const { owner, repo } = github.context.repo;
  return {
    owner,
    repo,
    number: pullRequest.number,
    title: pullRequest.title as string,
    body: (pullRequest.body as string | null) ?? '',
  };
}

export async function listPullRequestFiles(
  client: GitHubClient,
  pullRequest: PullRequestDetails,
): Promise<PullRequestFile[]> {
  const files = await client.paginate(client.rest.pulls.listFiles, {
    owner: pullRequest.owner,
    repo: pullRequest.repo,
    pull_number: pullRequest.number,
    per_page: 100,
  });
  return files.map((file) => ({
    filename: file.filename,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    ...(file.patch ? { patch: file.patch } : {}),
  }));
}
