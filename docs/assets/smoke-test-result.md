# PR Quality Bot Smoke Test Result

Smoke test PR: [TharushaWijayabahu/pr-quality-bot#3](https://github.com/TharushaWijayabahu/pr-quality-bot/pull/3)

Validated:

- [x] Bot workflow ran on a real PR
- [x] Bot posted a PR timeline comment
- [x] Bot updated the existing comment after a new commit
- [x] Bad PR title was detected
- [x] Missing linked issue was detected
- [x] TODO/FIXME comments were detected
- [x] Risk score was generated
- [x] Risk level was generated
- [x] Score improved after title and linked issue were fixed

The initial report scored the PR at 55/100 (Medium). After fixing the title and adding `Fixes #1`, the same comment was updated to 25/100 (Low).

Screenshot:

![PR Quality Bot smoke-test report](pr-quality-bot-smoke-test.png)
