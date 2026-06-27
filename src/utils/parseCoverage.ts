import { XMLParser } from 'fast-xml-parser';

function percentage(covered: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((covered / total) * 10_000) / 100;
}

export function parseLcov(content: string): number {
  let found = 0;
  let hit = 0;
  let explicitFound = 0;
  let explicitHit = 0;

  for (const line of content.split(/\r?\n/u)) {
    if (line.startsWith('DA:')) {
      const count = Number(line.split(',')[1]);
      if (Number.isFinite(count)) {
        found += 1;
        if (count > 0) hit += 1;
      }
    } else if (line.startsWith('LF:')) {
      explicitFound += Number(line.slice(3)) || 0;
    } else if (line.startsWith('LH:')) {
      explicitHit += Number(line.slice(3)) || 0;
    }
  }

  const total = explicitFound || found;
  const covered = explicitFound ? explicitHit : hit;
  if (total === 0) throw new Error('LCOV report contains no line coverage data.');
  return percentage(covered, total);
}

type XmlNode = Record<string, unknown>;

function asRecord(value: unknown): XmlNode | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as XmlNode)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

export function parseJacoco(content: string): number {
  const document = asRecord(new XMLParser({ ignoreAttributes: false }).parse(content));
  const report = asRecord(document?.report);
  const counters = asArray(report?.counter);
  const lineCounter = counters.map(asRecord).find((counter) => counter?.['@_type'] === 'LINE');
  if (!lineCounter) throw new Error('JaCoCo report contains no LINE counter.');
  const covered = Number(lineCounter['@_covered']);
  const missed = Number(lineCounter['@_missed']);
  if (!Number.isFinite(covered) || !Number.isFinite(missed)) {
    throw new Error('JaCoCo LINE counter is invalid.');
  }
  return percentage(covered, covered + missed);
}

export function parseCobertura(content: string): number {
  const document = asRecord(new XMLParser({ ignoreAttributes: false }).parse(content));
  const coverage = asRecord(document?.coverage);
  const lineRate = Number(coverage?.['@_line-rate']);
  if (!Number.isFinite(lineRate)) throw new Error('Cobertura report contains no line-rate.');
  return Math.round(lineRate * 10_000) / 100;
}

export function parseCoverageReport(path: string, content: string): number {
  if (/<!DOCTYPE|<!ENTITY/iu.test(content)) {
    throw new Error('XML document type and entity declarations are not supported.');
  }
  if (path.toLowerCase().endsWith('.info')) return parseLcov(content);
  if (/<coverage(?:\s|>)/u.test(content)) return parseCobertura(content);
  if (/<report(?:\s|>)/u.test(content)) return parseJacoco(content);
  throw new Error(`Unsupported coverage report format: ${path}`);
}
