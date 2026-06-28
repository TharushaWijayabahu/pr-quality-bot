# Security policy

## Supported versions

| Version | Supported |
| ------: | :-------: |
|     1.x |    Yes    |

Security fixes are provided for the latest major release. Users should pin a current release tag or commit SHA and keep Dependabot alerts enabled.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's **Security** tab to submit a private vulnerability report to the maintainers. Include affected versions, impact, reproduction steps, and any suggested mitigation.

Expect an acknowledgement within five business days. Maintainers will validate the report, coordinate a fix and disclosure timeline, and credit the reporter unless anonymity is requested.

Never include active tokens, private repository content, or other secrets in a report.

## Security model

PR Quality Bot treats pull request metadata, patches, configuration, and coverage reports as untrusted data. The released action inspects changed application code as data rather than executing it. This repository's local dogfood job may execute action code from a PR branch, but only with read-only permissions and comment publishing disabled. Privileged reporting uses an immutable reviewed action revision without checking out PR code. File reads are constrained to canonical paths inside the checkout and bounded by size; XML entities and unsafe configurable regular expressions are rejected.

The action is a quality-policy aid, not a security boundary. Repository administrators remain responsible for branch protection, workflow permissions, dependency review, and human review of sensitive changes.
