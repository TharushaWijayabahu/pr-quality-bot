# Smoke test plan

This guide explains how to verify the bot on a real pull request in a way that is safe, observable, and repeatable.

## 1. Create a test branch

Create a branch named `test/pr-quality-bot-smoke-test` and open a pull request from it.

## 2. Make a deliberately risky change

Use a weak title first, such as:

```text
update code
```

Leave the PR body without a linked issue reference. Add one new `TODO`, `FIXME`, or `HACK` line in a fixture or test file. Expand the patch enough to trigger change-size warnings.

## 3. Open the PR and observe the action

Open the PR and confirm that the workflow runs. The action should produce a report comment, workflow logs, and outputs.

## 4. Confirm idempotent comment behavior

Push a second commit and confirm that the existing bot comment is updated instead of duplicated.

## 5. Improve the PR quality signals

Edit the PR title to a Conventional Commit-style title such as `fix: improve PR quality bot reporting`. Add a linked issue reference such as `Fixes #1` or `JIRA-123`.

## 6. Validate the updated report

Re-run or update the PR and confirm that the report improves.

## Expected results

- A risk score is visible.
- A risk level is visible.
- The checks table is present.
- A TODO/FIXME finding is present.
- A linked issue warning appears when the PR body lacks a reference.
- A title warning appears for the weak initial title.
- The comment is updated instead of duplicated.
- Workflow logs show the action outputs.

## Screenshot or proof

Capture a screenshot of the bot comment and add it to [docs/assets](docs/assets) or link it from the README once the smoke-test PR is complete.

## Checklist

- [ ] Branch created
- [ ] Risky PR opened
- [ ] Bot comment posted
- [ ] Comment updated on second push
- [ ] Title and linked issue improved
- [ ] Screenshot or proof captured
