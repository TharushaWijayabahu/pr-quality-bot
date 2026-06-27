export type RiskLevel = 'low' | 'medium' | 'high';
export type FailOnRisk = 'none' | 'medium' | 'high';

export interface RiskWeights {
  title: number;
  linkedIssue: number;
  coverage: number;
  changeSize: number;
  todo: number;
}

export interface Config {
  title: { regex: string };
  linkedIssue: { required: boolean; regex: string };
  coverage: { min: number; paths: string[] };
  changeSize: {
    maxFilesChanged: number;
    maxAdditions: number;
    maxDeletions: number;
    largeFileThresholdKb: number;
  };
  todo: { max: number; keywords: string[] };
  risk: { failOn: FailOnRisk; weights: RiskWeights };
  comment: { enabled: boolean; marker: string };
}

export interface PullRequestFile {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface TitleResult {
  name: 'title';
  passed: boolean;
  warning: false;
  message: string;
  actual: string;
  expected: string;
  riskPoints: number;
}

export interface LinkedIssueResult {
  name: 'linkedIssue';
  passed: boolean;
  warning: false;
  matchedReference?: string;
  message: string;
  riskPoints: number;
}

export interface CoverageResult {
  name: 'coverage';
  passed: boolean;
  warning: boolean;
  coverage?: number;
  minimum: number;
  reportPath?: string;
  message: string;
  riskPoints: number;
}

export interface ChangeSizeResult {
  name: 'changeSize';
  passed: boolean;
  warning: boolean;
  changedFiles: number;
  additions: number;
  deletions: number;
  totalChanges: number;
  largeFiles: string[];
  riskyFiles: string[];
  warnings: string[];
  message: string;
  riskPoints: number;
}

export interface TodoFinding {
  path: string;
  line: string;
  keyword: string;
}

export interface TodoResult {
  name: 'todo';
  passed: boolean;
  warning: false;
  count: number;
  findings: TodoFinding[];
  message: string;
  riskPoints: number;
}

export type AnalyzerResult =
  | TitleResult
  | LinkedIssueResult
  | CoverageResult
  | ChangeSizeResult
  | TodoResult;

export interface RiskResult {
  score: number;
  level: RiskLevel;
  passed: boolean;
  failedChecks: string[];
  warningChecks: string[];
}

export interface AnalysisSummary {
  title: TitleResult;
  linkedIssue: LinkedIssueResult;
  coverage: CoverageResult;
  changeSize: ChangeSizeResult;
  todo: TodoResult;
  risk: RiskResult;
}

export interface PullRequestDetails {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
}
