# Contributing

Thanks for helping improve PR Quality Bot.

## Before opening an issue

Search existing issues first. For bugs, include the action version, a redacted workflow and configuration, relevant logs, expected behavior, and actual behavior. Never include a GitHub token or repository secret.

## Development workflow

1. Fork the repository and create a focused branch.
2. Install Node.js 22 or newer and run `npm ci`.
3. Add or update tests with the implementation.
4. Run `npm run all`.
5. Rebuild and commit `dist/` when `src/` or runtime dependencies change.
6. Open a pull request using a Conventional Commit-style title and link its issue.

Keep analyzers deterministic and independent of GitHub API calls. Put API behavior in the client or publishing layer. New configuration must be documented in `action.yml`, the README, and an example where appropriate.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Contributions are licensed under the project's MIT license.
