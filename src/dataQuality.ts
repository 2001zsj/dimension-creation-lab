export type DataSource = 'yuc' | 'age' | 'local';
export type FieldSource = { source: DataSource; url: string; capturedAt: string };
export type ResourceStatus = 'verified' | 'unverified' | 'blocked' | 'unavailable';
export interface PopularityMetric {
  value: number;
  label: string;
  source: DataSource;
  sourceUrl: string;
  capturedAt: string;
}

export interface ResourceRecord {
  id: string;
  animeId: string;
  kind: 'detail' | 'episode' | 'media';
  label?: string;
  url: string;
  source: DataSource;
  sourceUrl: string;
  status: ResourceStatus;
  capturedAt: string;
}

const PLACEHOLDER_TEXT = /^(?:公开资料待补全|平台请以官方公告为准|暂无简介|暂无|未知|待补全|未公开|n\/a|无)$/i;

export function isPlaceholder(value: unknown): boolean {
  if (typeof value !== 'string') return value === undefined || value === null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return !normalized || PLACEHOLDER_TEXT.test(normalized);
}

export function cleanOptional<T>(value: T): T | undefined {
  return isPlaceholder(value) ? undefined : value;
}

export function safeMerge<T extends Record<string, unknown>>(oldValue: T, incoming: Partial<T>, quality: { valid: boolean; conflicts: string[] }): T {
  if (!quality.valid) return oldValue;
  const result = { ...oldValue };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined || value === null || value === '' || isPlaceholder(value)) continue;
    if (result[key] !== undefined && result[key] !== value) quality.conflicts.push(key);
    (result as Record<string, unknown>)[key] = value;
  }
  return result;
}

export function fieldCoverage(record: Record<string, unknown>, fields: string[]): number {
  if (!fields.length) return 1;
  return fields.filter((field) => !isPlaceholder(record[field])).length / fields.length;
}

export function auditRecord(record: object, requiredFields: string[]) {
  const values = record as Record<string, unknown>;
  const missing = requiredFields.filter((field) => isPlaceholder(values[field]));
  return { valid: Boolean(values.id) && missing.length < requiredFields.length, missing, coverage: 1 - missing.length / Math.max(requiredFields.length, 1) };
}
