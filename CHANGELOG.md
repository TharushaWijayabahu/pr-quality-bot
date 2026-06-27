# Changelog

All notable changes to this project will be documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use semantic versioning.

## Unreleased

### Features

- Initial production-ready GitHub Action implementation.
- Add configurable title, issue-link, coverage, change-size, and TODO analyzers.
- Add stable PR comments, machine-readable outputs, and changelog generation.

### Security

- Constrain file reads to canonical workspace paths with size limits.
- Reject unsafe configurable regular expressions and XML entity declarations.
- Escape pull request content included in generated comments.
- Add CodeQL, dependency review, Dependabot, and immutable CI action pins.
