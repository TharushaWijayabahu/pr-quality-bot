import * as core from '@actions/core';
import { analyzeChangeSize } from './analyzers/changeSizeAnalyzer';
import { analyzeCoverage } from './analyzers/coverageAnalyzer';
import { analyzeLinkedIssue } from './analyzers/linkedIssueAnalyzer';
import { scoreRisk } from './analyzers/riskScorer';
import { analyzeTitle } from './analyzers/titleAnalyzer';
import { analyzeTodos } from './analyzers/todoAnalyzer';
import { buildComment } from './comment/commentBuilder';
import { publishComment } from './comment/commentPublisher';
import { loadConfig } from './config';
import { createGitHubClient, getPullRequestDetails, listPullRequestFiles } from './githubClient';
import type { AnalysisSummary } from './models/types';
import { logger } from './utils/logger';

export async function run(): Promise<void> {
  try {
    const config = loadConfig();
    const pullRequest = getPullRequestDetails();
    const client = createGitHubClient(core.getInput('github-token'));
    const files = await listPullRequestFiles(client, pullRequest);
    logger.info(
      `Analyzing pull request #${pullRequest.number} with ${files.length} changed files.`,
    );

    const title = analyzeTitle(pullRequest.title, config.title.regex, config.risk.weights.title);
    const linkedIssue = analyzeLinkedIssue(
      pullRequest.title,
      pullRequest.body,
      config.linkedIssue.required,
      config.linkedIssue.regex,
      config.risk.weights.linkedIssue,
    );
    const coverage = analyzeCoverage(
      config.coverage.paths,
      config.coverage.min,
      config.risk.weights.coverage,
      process.env.GITHUB_WORKSPACE,
    );
    const changeSize = analyzeChangeSize(
      files,
      config.changeSize,
      config.risk.weights.changeSize,
      process.env.GITHUB_WORKSPACE,
    );
    const todo = analyzeTodos(
      files,
      config.todo.max,
      config.todo.keywords,
      config.risk.weights.todo,
    );
    const risk = scoreRisk([title, linkedIssue, coverage, changeSize, todo], config.risk.failOn);
    const summary: AnalysisSummary = { title, linkedIssue, coverage, changeSize, todo, risk };

    core.setOutput('risk-score', risk.score);
    core.setOutput('risk-level', risk.level);
    core.setOutput('passed', risk.passed);
    core.setOutput('summary-json', JSON.stringify(summary));

    for (const result of [title, linkedIssue, coverage, changeSize, todo]) {
      if (result.warning || !result.passed) logger.warning(result.message);
      else logger.info(result.message);
    }

    if (config.comment.enabled) {
      try {
        const operation = await publishComment(
          client,
          pullRequest.owner,
          pullRequest.repo,
          pullRequest.number,
          config.comment.marker,
          buildComment(summary, config.comment.marker),
        );
        logger.info(`PR report comment ${operation}.`);
      } catch (error) {
        logger.warning(
          `Could not post the PR comment. Check workflow permissions: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (!risk.passed) {
      core.setFailed(
        `PR risk level '${risk.level}' reached the configured fail-on-risk threshold '${config.risk.failOn}'.`,
      );
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

void run();
