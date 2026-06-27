import type { LinkedIssueResult } from '../models/types';

export function analyzeLinkedIssue(
  title: string,
  body: string,
  required: boolean,
  regex: string,
  riskPoints = 15,
): LinkedIssueResult {
  if (!required) {
    return {
      name: 'linkedIssue',
      passed: true,
      warning: false,
      message: 'Linked issue check is disabled.',
      riskPoints: 0,
    };
  }

  const match = `${title}\n${body}`.match(new RegExp(regex, 'i'));
  return {
    name: 'linkedIssue',
    passed: Boolean(match),
    warning: false,
    matchedReference: match?.[0],
    message: match
      ? `Found linked issue reference: ${match[0]}`
      : 'No linked issue reference found.',
    riskPoints: match ? 0 : riskPoints,
  };
}
