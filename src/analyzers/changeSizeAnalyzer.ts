import { extname } from 'node:path';
import type { ChangeSizeResult, Config, PullRequestFile } from '../models/types';
import { localFileSizeKb } from '../utils/fileUtils';

const riskyExtensions = new Set([
  '.sql',
  '.sh',
  '.yml',
  '.yaml',
  '.tf',
  '.properties',
  '.env',
  '.pem',
  '.key',
]);

function isRiskyFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return riskyExtensions.has(extname(lower)) || lower.endsWith('.env');
}

export function analyzeChangeSize(
  files: PullRequestFile[],
  config: Config['changeSize'],
  maxRiskPoints = 25,
  workspace = process.cwd(),
): ChangeSizeResult {
  const additions = files.reduce((total, file) => total + file.additions, 0);
  const deletions = files.reduce((total, file) => total + file.deletions, 0);
  const riskyFiles = files
    .filter((file) => isRiskyFile(file.filename))
    .map((file) => file.filename);
  const largeFiles = files
    .filter(
      (file) => (localFileSizeKb(file.filename, workspace) ?? 0) > config.largeFileThresholdKb,
    )
    .map((file) => file.filename);
  const warnings: string[] = [];

  if (files.length > config.maxFilesChanged) {
    warnings.push(`${files.length} files changed (limit ${config.maxFilesChanged})`);
  }
  if (additions > config.maxAdditions) {
    warnings.push(`${additions} additions (limit ${config.maxAdditions})`);
  }
  if (deletions > config.maxDeletions) {
    warnings.push(`${deletions} deletions (limit ${config.maxDeletions})`);
  }
  if (riskyFiles.length > 0)
    warnings.push(`Risk-sensitive files changed: ${riskyFiles.join(', ')}`);
  if (largeFiles.length > 0) warnings.push(`Large files changed: ${largeFiles.join(', ')}`);

  const riskPoints = Math.min(
    maxRiskPoints,
    warnings.length === 0 ? 0 : Math.ceil((warnings.length / 5) * maxRiskPoints),
  );
  return {
    name: 'changeSize',
    passed: warnings.length === 0,
    warning: warnings.length > 0,
    changedFiles: files.length,
    additions,
    deletions,
    totalChanges: additions + deletions,
    largeFiles,
    riskyFiles,
    warnings,
    message:
      warnings.length === 0
        ? `${files.length} files, ${additions} additions, ${deletions} deletions.`
        : warnings.join('; '),
    riskPoints,
  };
}
