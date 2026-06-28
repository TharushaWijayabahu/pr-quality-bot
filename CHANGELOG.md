# Changelog

All notable changes to this project will be documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use semantic versioning.

## Unreleased

### Documentation

- Added a smoke-test guide, roadmap, and clearer release notes for Phase 1 readiness.

### CI

- Added workflow validation with actionlint and a self-dogfooding PR workflow.

## 1.0.1 - 2026-06-27

### Security

- Read workspace files through no-follow file descriptors to prevent check/read races.
- Make PR comment escaping single-pass and exclude generated bundles from source analysis.

## 1.0.0 - 2026-06-27

### Features

- Added PR title validation using configurable Conventional Commit-style regex.
- Added linked issue detection for GitHub and Jira-style references.
- Added coverage parsing for LCOV, JaCoCo XML, and Cobertura XML.
- Added large PR, large file, and risk-sensitive file checks.
- Added TODO/FIXME/HACK detection for added PR patch lines.
- Added configurable 0 to 100 risk scoring.
- Added idempotent PR timeline comment publishing.
- Added changelog generation from merged pull requests.
- Added GitHub Actions CI, CodeQL, Dependabot, and release workflow support.

### Security

- Uses least-privilege workflow permissions.
- Avoids executing changed PR code.
- Documents pull_request_target risks.
- Keeps token handling inside GitHub Actions.

### Documentation

- Added README, examples, contribution guide, security policy, and MIT license.
