import type { TitleResult } from '../models/types';

export function analyzeTitle(title: string, regex: string, riskPoints = 15): TitleResult {
  const passed = new RegExp(regex).test(title);
  return {
    name: 'title',
    passed,
    warning: false,
    actual: title,
    expected: regex,
    message: passed
      ? `Title matches the configured format: ${title}`
      : `Title does not match the configured format: ${title}`,
    riskPoints: passed ? 0 : riskPoints,
  };
}
