# PR Quality Bot

[![CI](https://github.com/TharushaWijayabahu/pr-quality-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/TharushaWijayabahu/pr-quality-bot/actions/workflows/ci.yml)
[![CodeQL](https://github.com/TharushaWijayabahu/pr-quality-bot/actions/workflows/codeql.yml/badge.svg)](https://github.com/TharushaWijayabahu/pr-quality-bot/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Designed to help maintainers review pull request risk using deterministic checks.

## Problem

Pull request review standards are often documented but applied inconsistently. This action supports lightweight, repeatable checks for titles, linked issues, coverage, change size, and TODO markers, while keeping the workflow fully inside GitHub Actions.

## Features

- Validates Conventional Commit-style PR titles.
- Checks for linked issues in the title or body.
- Reads coverage from LCOV, JaCoCo XML, or Cobertura XML reports.
- Flags large changes, large files, and risk-sensitive file types.
- Scans only added patch lines for TODO, FIXME, and HACK markers.
- Produces a configurable 0–100 risk score and pass/fail policy.
- Creates or updates a single PR timeline comment.
- Generates grouped changelog entries from merged pull requests.
- Exposes machine-readable outputs for later workflow steps.

## Quick start

Create a workflow such as the example below:

```yaml
name: PR Quality Bot

on:
  pull_request:
    types: [opened, synchronize, reopened, edited]

permissions:
  contents: read
  pull-requests: write

jobs:
  pr-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0

      - name: Run PR Quality Bot
        uses: TharushaWijayabahu/pr-quality-bot@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          min-coverage: '80'
          fail-on-risk: high
```

Checkout is needed for local file-size checks and coverage artifact discovery. PR metadata and patches come from the GitHub API.

## Recommended workflow

1. Use the action on pull requests.
2. Keep the review policy explicit in a configuration file.
3. Treat the report as a signal for maintainers rather than a replacement for review.
4. Use the outputs for follow-up automation where helpful.

This repository also dogfoods the action. The [local workflow](.github/workflows/pr-quality.yml) exercises PR branch code read-only with comment publishing disabled; the [reporting workflow](.github/workflows/pr-quality-report.yml) publishes reports using an immutable reviewed action revision without checking out PR code.

## Configuration

The default config path is `.github/pr-quality-bot.yml`. Copy the complete example from [examples/pr-quality-bot.yml](examples/pr-quality-bot.yml), or start with:

```yaml
title:
  regex: '^(feat|fix|docs|refactor|test|chore)(?:\([a-zA-Z0-9._-]{1,64}\)|): .{10,256}$'

linkedIssue:
  required: true
  regex: '(close[sd]?|fix(e[sd])?|resolve[sd]?)\s+#\d+|#[0-9]+|[A-Z]{2,10}-\d+'

coverage:
  min: 80
  paths:
    - coverage/lcov.info
    - target/site/jacoco/jacoco.xml

changeSize:
  maxFilesChanged: 25
  maxAdditions: 500
  maxDeletions: 300
  largeFileThresholdKb: 500

todo:
  max: 0
  keywords: [TODO, FIXME, HACK]

risk:
  failOn: high
  weights:
    title: 15
    linkedIssue: 15
    coverage: 25
    changeSize: 25
    todo: 20

comment:
  enabled: true
```

Workflow inputs override the corresponding config-file values. Invalid regexes, thresholds, arrays, and risk levels produce a concise action error.

## Inputs

| Input                     | Default                            | Description                                       |
| ------------------------- | ---------------------------------- | ------------------------------------------------- |
| `github-token`            | `${{ github.token }}`              | Token used to read PR data and post comments.     |
| `config-path`             | `.github/pr-quality-bot.yml`       | Optional YAML configuration path.                 |
| `title-regex`             | Conventional Commit pattern        | PR title validation regex.                        |
| `require-linked-issue`    | `true`                             | Require an issue reference in the title or body.  |
| `linked-issue-regex`      | GitHub/Jira-style pattern          | Issue reference regex.                            |
| `coverage-report-paths`   | Common LCOV/JaCoCo/Cobertura paths | Comma-separated coverage paths checked in order.  |
| `min-coverage`            | `80`                               | Required line coverage; `0` disables enforcement. |
| `max-files-changed`       | `25`                               | Changed-file warning threshold.                   |
| `max-additions`           | `500`                              | Addition warning threshold.                       |
| `max-deletions`           | `300`                              | Deletion warning threshold.                       |
| `large-file-threshold-kb` | `500`                              | Local changed-file size threshold.                |
| `todo-fixme-max`          | `0`                                | Allowed markers in added patch lines.             |
| `fail-on-risk`            | `high`                             | Failure threshold: `none`, `medium`, or `high`.   |
| `post-comment`            | `true`                             | Create or update the PR report comment.           |
| `comment-marker`          | `<!-- pr-quality-bot-comment -->`  | Marker used to locate an existing comment.        |

## Outputs

| Output         | Description                                                      |
| -------------- | ---------------------------------------------------------------- |
| `risk-score`   | Numeric risk score from 0 to 100.                                |
| `risk-level`   | `low`, `medium`, or `high`.                                      |
| `passed`       | Whether the score remains below `fail-on-risk`.                  |
| `summary-json` | JSON containing every analyzer result and the final risk result. |

Use an output by assigning an `id` to the action step:

```yaml
- id: quality
  uses: TharushaWijayabahu/pr-quality-bot@v1
- run: echo "Risk is ${{ steps.quality.outputs.risk-level }}"
```

## Risk scoring

The default scoring weights are title `15`, linked issue `15`, coverage `25`, change size `25`, and TODO/FIXME `20`. Change-size points increase with the number of triggered categories such as file count, additions, deletions, sensitive types, and large files. Scores are capped at 100.

|  Score | Level  | Default action behavior       |
| -----: | ------ | ----------------------------- |
|   0–29 | Low    | Pass                          |
|  30–69 | Medium | Pass with attention requested |
| 70–100 | High   | Fail                          |

`fail-on-risk` changes the action failure threshold without changing the score or level. A missing or unreadable coverage report is treated as a warning with zero risk points rather than a crash.

## Sample PR comment

> ## PR Quality Bot Report
>
> Overall result: ⚠️ Needs attention
>
> Risk score: 42 / 100
>
> Risk level: Medium
>
> | Check    |     Result | Details                                |
> | -------- | ---------: | -------------------------------------- |
> | PR title |  ✅ Passed | feat(auth): add refresh token rotation |
> | Coverage | ⚠️ Warning | 76.5%, required 80%                    |

The hidden marker allows each run to update the same timeline comment instead of adding noise.

## Demo

The bot was validated on [smoke-test PR #3](https://github.com/TharushaWijayabahu/pr-quality-bot/pull/3). The report comment was created once, updated in place on later runs, and improved from 55/100 (Medium) to 25/100 (Low) after the title and linked issue were corrected.

See the [validation record](docs/assets/smoke-test-result.md) and [real PR screenshot](docs/assets/pr-quality-bot-smoke-test.png).

## Changelog generation

Run the Generate changelog workflow manually and download its artifact, or run locally with `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, and an optional `CHANGELOG_VERSION` set:

```bash
npm run changelog
```

Merged PRs since the latest Git tag are grouped into Features, Fixes, Documentation, Refactoring, Performance, Tests, Maintenance, and Other sections. Each entry includes its PR number and author.

## Security and permissions

The recommended permissions are `contents: read` and `pull-requests: write`. PR Quality Bot posts normal PR timeline comments. GitHub treats pull requests as issues for timeline comments, but `pull-requests: write` is the recommended permission for the documented workflow. Some repository policies may require `issues: write`; if comment publishing fails, add it based on your organization policy. Use the minimum permissions required by your repository policy.

In this repository's dogfood setup, coverage enforcement is disabled because the bot runs before a coverage artifact is generated. User projects can enable coverage by setting `min-coverage` and generating coverage reports before running the action.

### Security model

1. The local validation workflow runs `uses: ./` with read-only permissions and `post-comment: false`.
2. The reporting workflow uses an immutable reviewed revision of PR Quality Bot, not PR branch code.
3. The reporting workflow does not check out or execute PR-controlled code.
4. No artifacts or outputs pass from the read-only workflow into the privileged workflow.
5. `pull_request_target` is used only for trusted reporting without an untrusted checkout.

Treat pull request metadata, patches, configuration, and coverage reports as untrusted data. Configuration and report paths are constrained to the workspace, symlinks and XML entity declarations are rejected, report sizes are bounded, and configurable regular expressions are checked for unsafe backtracking. Pin the action to a release tag or full commit SHA according to your dependency policy. See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## Local development

Node.js 22 or newer is required.

```bash
npm ci
npm run all
```

`npm run build` type-checks the project and packages `src/index.ts` into the committed `dist/index.js`. Action-source changes should include the rebuilt `dist` output.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the next planned improvements.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md) before opening a change.

## License

This project is licensed under the MIT License. You can use, copy, modify, and distribute it, including in commercial projects, as long as the license notice is preserved. The software is provided as-is without warranty.
