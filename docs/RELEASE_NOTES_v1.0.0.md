# PR Quality Bot v1.0.0 release notes

PR Quality Bot is a configurable GitHub Action for reviewing pull requests, scoring quality risk, and posting a concise report comment.

## Highlights

- Validates PR titles with configurable Conventional Commit-style regex.
- Detects linked issues in titles and bodies.
- Parses LCOV, JaCoCo XML, and Cobertura XML coverage reports.
- Flags large changes, large files, and risky file patterns.
- Detects TODO/FIXME/HACK markers in added patch lines.
- Publishes a single idempotent PR comment that updates on each run.
- Supports changelog generation and CI workflows for release quality.

## Security

- Uses least-privilege workflow permissions.
- Avoids executing changed PR code.
- Documents pull_request_target risks.
- Keeps token handling inside GitHub Actions.
