import * as core from '@actions/core';
import yaml from 'js-yaml';
import safeRegex from 'safe-regex2';
import type { Config, FailOnRisk } from './models/types';
import { isPathInsideWorkspace, readWorkspaceFile } from './utils/fileUtils';

const MAX_CONFIG_BYTES = 64 * 1024;
const MAX_REGEX_LENGTH = 1_000;

export const defaultConfig: Config = {
  title: {
    regex:
      '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(?:\\([a-zA-Z0-9._-]{1,64}\\)|)!?: .{10,256}$',
  },
  linkedIssue: {
    required: true,
    regex: '(close[sd]?|fix(e[sd])?|resolve[sd]?)\\s+#\\d+|#[0-9]+|[A-Z]{2,10}-\\d+',
  },
  coverage: {
    min: 80,
    paths: [
      'coverage/lcov.info',
      'target/site/jacoco/jacoco.xml',
      'build/reports/jacoco/test/jacocoTestReport.xml',
      'coverage/cobertura-coverage.xml',
    ],
  },
  changeSize: {
    maxFilesChanged: 25,
    maxAdditions: 500,
    maxDeletions: 300,
    largeFileThresholdKb: 500,
  },
  todo: { max: 0, keywords: ['TODO', 'FIXME', 'HACK'] },
  risk: {
    failOn: 'high',
    weights: { title: 15, linkedIssue: 15, coverage: 25, changeSize: 25, todo: 20 },
  },
  comment: { enabled: true, marker: '<!-- pr-quality-bot-comment -->' },
};

type PartialConfig = {
  title?: Partial<Config['title']>;
  linkedIssue?: Partial<Config['linkedIssue']>;
  coverage?: Partial<Config['coverage']>;
  changeSize?: Partial<Config['changeSize']>;
  todo?: Partial<Config['todo']>;
  risk?: { failOn?: FailOnRisk; weights?: Partial<Config['risk']['weights']> };
  comment?: Partial<Config['comment']>;
};

const inputDefaults: Record<string, string> = {
  'title-regex': defaultConfig.title.regex,
  'require-linked-issue': String(defaultConfig.linkedIssue.required),
  'linked-issue-regex': defaultConfig.linkedIssue.regex,
  'coverage-report-paths': defaultConfig.coverage.paths.join(','),
  'min-coverage': String(defaultConfig.coverage.min),
  'max-files-changed': String(defaultConfig.changeSize.maxFilesChanged),
  'max-additions': String(defaultConfig.changeSize.maxAdditions),
  'max-deletions': String(defaultConfig.changeSize.maxDeletions),
  'large-file-threshold-kb': String(defaultConfig.changeSize.largeFileThresholdKb),
  'todo-fixme-max': String(defaultConfig.todo.max),
  'fail-on-risk': defaultConfig.risk.failOn,
  'post-comment': String(defaultConfig.comment.enabled),
  'comment-marker': defaultConfig.comment.marker,
};

function mergeConfig(base: Config, override: PartialConfig): Config {
  return {
    title: { ...base.title, ...override.title },
    linkedIssue: { ...base.linkedIssue, ...override.linkedIssue },
    coverage: { ...base.coverage, ...override.coverage },
    changeSize: { ...base.changeSize, ...override.changeSize },
    todo: { ...base.todo, ...override.todo },
    risk: {
      ...base.risk,
      ...override.risk,
      weights: { ...base.risk.weights, ...override.risk?.weights },
    },
    comment: { ...base.comment, ...override.comment },
  };
}

function readYamlConfig(path: string, workspace: string): PartialConfig {
  const file = readWorkspaceFile(path, workspace, MAX_CONFIG_BYTES);
  if (!file) return {};
  const parsed: unknown = yaml.load(file.content);
  if (parsed === null || parsed === undefined) return {};
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Configuration in ${path} must be a YAML object.`);
  }
  const document = parsed as Record<string, unknown>;
  for (const section of [
    'title',
    'linkedIssue',
    'coverage',
    'changeSize',
    'todo',
    'risk',
    'comment',
  ]) {
    const value = document[section];
    if (
      value !== undefined &&
      (value === null || typeof value !== 'object' || Array.isArray(value))
    ) {
      throw new Error(`Configuration section '${section}' in ${path} must be an object.`);
    }
  }
  const risk = document.risk as Record<string, unknown> | undefined;
  const weights = risk?.weights;
  if (
    weights !== undefined &&
    (weights === null || typeof weights !== 'object' || Array.isArray(weights))
  ) {
    throw new Error(`Configuration section 'risk.weights' in ${path} must be an object.`);
  }
  return parsed;
}

function validateRegex(pattern: string, label: string, flags?: string): void {
  if (pattern.length > MAX_REGEX_LENGTH) {
    throw new Error(`${label} cannot exceed ${MAX_REGEX_LENGTH} characters.`);
  }
  try {
    const expression = new RegExp(pattern, flags);
    if (!safeRegex(expression)) {
      throw new Error('pattern may cause catastrophic backtracking');
    }
  } catch (error) {
    throw new Error(`Invalid ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function customInput(name: string): string | undefined {
  const value = core.getInput(name).trim();
  if (!value || value === inputDefaults[name]) return undefined;
  return value;
}

function numberInput(name: string, current: number): number {
  const raw = customInput(name);
  if (raw === undefined) return current;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Input '${name}' must be a non-negative number; received '${raw}'.`);
  }
  return value;
}

function booleanInput(name: string, current: boolean): boolean {
  const raw = customInput(name)?.toLowerCase();
  if (raw === undefined) return current;
  if (raw !== 'true' && raw !== 'false') {
    throw new Error(`Input '${name}' must be 'true' or 'false'; received '${raw}'.`);
  }
  return raw === 'true';
}

function validate(config: Config): Config {
  if (typeof config.title.regex !== 'string' || typeof config.linkedIssue.regex !== 'string') {
    throw new Error('title.regex and linkedIssue.regex must be strings.');
  }
  if (
    typeof config.linkedIssue.required !== 'boolean' ||
    typeof config.comment.enabled !== 'boolean'
  ) {
    throw new Error('linkedIssue.required and comment.enabled must be booleans.');
  }
  validateRegex(config.title.regex, 'title regex');
  validateRegex(config.linkedIssue.regex, 'linked issue regex', 'i');
  if (!['none', 'medium', 'high'].includes(config.risk.failOn)) {
    throw new Error("risk.failOn must be one of 'none', 'medium', or 'high'.");
  }
  const numericValues: number[] = [
    config.coverage.min,
    config.changeSize.maxFilesChanged,
    config.changeSize.maxAdditions,
    config.changeSize.maxDeletions,
    config.changeSize.largeFileThresholdKb,
    config.todo.max,
    config.risk.weights.title,
    config.risk.weights.linkedIssue,
    config.risk.weights.coverage,
    config.risk.weights.changeSize,
    config.risk.weights.todo,
  ];
  if (numericValues.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('All thresholds and risk weights must be non-negative numbers.');
  }
  if (config.coverage.min > 100) throw new Error('coverage.min cannot exceed 100.');
  if (!Array.isArray(config.coverage.paths) || !Array.isArray(config.todo.keywords)) {
    throw new Error('coverage.paths and todo.keywords must be YAML arrays.');
  }
  if (
    config.coverage.paths.some((path) => typeof path !== 'string' || !path.trim()) ||
    config.todo.keywords.length === 0 ||
    config.todo.keywords.some((keyword) => typeof keyword !== 'string' || !keyword.trim())
  ) {
    throw new Error('Coverage paths and TODO keywords must be non-empty strings.');
  }
  if (config.coverage.paths.length > 50 || config.todo.keywords.length > 50) {
    throw new Error('coverage.paths and todo.keywords cannot contain more than 50 entries.');
  }
  if (config.todo.keywords.some((keyword) => keyword.length > 100)) {
    throw new Error('TODO keywords cannot exceed 100 characters.');
  }
  if (
    typeof config.comment.marker !== 'string' ||
    !/^<!-- pr-quality-bot(?:-[a-zA-Z0-9._-]+)? -->$/u.test(config.comment.marker)
  ) {
    throw new Error(
      "comment.marker must be a namespaced HTML comment such as '<!-- pr-quality-bot-comment -->'.",
    );
  }
  return config;
}

export function loadConfig(workspace = process.env.GITHUB_WORKSPACE ?? process.cwd()): Config {
  const configPathInput = core.getInput('config-path').trim() || '.github/pr-quality-bot.yml';
  if (!isPathInsideWorkspace(configPathInput, workspace)) {
    throw new Error("Input 'config-path' must point to a file inside the GitHub workspace.");
  }
  let config = mergeConfig(defaultConfig, readYamlConfig(configPathInput, workspace));

  const paths = customInput('coverage-report-paths');
  const failOn = customInput('fail-on-risk');
  if (failOn && !['none', 'medium', 'high'].includes(failOn)) {
    throw new Error("Input 'fail-on-risk' must be one of 'none', 'medium', or 'high'.");
  }

  const coveragePaths = paths
    ? paths
        .split(',')
        .map((path) => path.trim())
        .filter(Boolean)
    : config.coverage.paths;

  if (coveragePaths.some((path) => !isPathInsideWorkspace(path, workspace))) {
    throw new Error(
      "Input 'coverage-report-paths' must only include files inside the GitHub workspace.",
    );
  }

  config = mergeConfig(config, {
    title: { regex: customInput('title-regex') ?? config.title.regex },
    linkedIssue: {
      required: booleanInput('require-linked-issue', config.linkedIssue.required),
      regex: customInput('linked-issue-regex') ?? config.linkedIssue.regex,
    },
    coverage: {
      min: numberInput('min-coverage', config.coverage.min),
      paths: coveragePaths,
    },
    changeSize: {
      maxFilesChanged: numberInput('max-files-changed', config.changeSize.maxFilesChanged),
      maxAdditions: numberInput('max-additions', config.changeSize.maxAdditions),
      maxDeletions: numberInput('max-deletions', config.changeSize.maxDeletions),
      largeFileThresholdKb: numberInput(
        'large-file-threshold-kb',
        config.changeSize.largeFileThresholdKb,
      ),
    },
    todo: { max: numberInput('todo-fixme-max', config.todo.max) },
    risk: { failOn: (failOn as FailOnRisk | undefined) ?? config.risk.failOn },
    comment: {
      enabled: booleanInput('post-comment', config.comment.enabled),
      marker: customInput('comment-marker') ?? config.comment.marker,
    },
  });

  return validate(config);
}
