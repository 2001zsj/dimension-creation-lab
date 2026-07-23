export type DataSource = 'yuc' | 'age' | 'local' | 'official' | 'platform';

export type FieldSource = {
  source: DataSource;
  url: string;
  capturedAt: string;
  inferred?: boolean;
  confidence?: number;
  note?: string;
};

export type ResourceStatus = 'verified' | 'unverified' | 'blocked' | 'unavailable' | 'unchecked';
export type AuthorizationStatus = 'official' | 'authorized' | 'unknown' | 'unverified' | 'unauthorized' | 'disputed';
export type AvailabilityStatus = 'available' | 'unavailable' | 'unchecked' | 'redirected' | 'expired';
export type ResourceKind =
  | 'detail'
  | 'episode'
  | 'media'
  | 'streaming'
  | 'download'
  | 'cloud_drive'
  | 'subtitle'
  | 'mirror'
  | 'anti_loss'
  | 'official'
  | 'pv'
  | 'reference';

export interface PopularityMetric {
  value: number;
  label: string;
  source: DataSource;
  sourceUrl: string;
  capturedAt: string;
  scope?: string;
  inferred?: boolean;
}

export interface ResourceRecord {
  id: string;
  animeId: string;
  resourceId?: string;
  workId?: string;
  kind: ResourceKind;
  resourceType?: ResourceKind;
  label?: string;
  url: string;
  originalUrl?: string;
  source: DataSource;
  sourceUrl: string;
  sourcePage?: string;
  status: ResourceStatus;
  availabilityStatus?: AvailabilityStatus;
  authorizationStatus?: AuthorizationStatus;
  capturedAt: string;
  verifiedAt?: string;
  episode?: string;
  line?: string;
  lineId?: string;
  extractionCode?: string;
  note?: string;
}

const PLACEHOLDER_TEXT = /^(?:公开资料待补全|公开资料待补充|平台请以官方公告为准|暂无简介|暂无|未知|待补全|待补充|未公开|n\/a|无|资料待补全|资料待补充)$/i;
const TEMPLATE_TEXT = /(?:\{\{[^}]+\}\}|<%=?[\s\S]*?%>|\$\{[^}]+\})/;

export function isPlaceholder(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0 || value.every(isPlaceholder);
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  if (typeof value !== 'string') return false;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return !normalized || PLACEHOLDER_TEXT.test(normalized) || TEMPLATE_TEXT.test(normalized);
}

export function cleanOptional<T>(value: T): T | undefined {
  return isPlaceholder(value) ? undefined : value;
}

export function normalizeTitle(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\u3000·・:：!！?？,，.。'"“”‘’()（）\[\]【】《》<>_\-—]+/g, '')
    .replace(/(?:第\d+期|season\d+|part\.?\d+)$/i, '');
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return left === right;
}

export function safeMerge<T extends Record<string, unknown>>(
  oldValue: T,
  incoming: Partial<T>,
  quality: { valid: boolean; conflicts: string[] },
): T {
  if (!quality.valid) return oldValue;
  const result = { ...oldValue } as Record<string, unknown>;
  for (const [key, value] of Object.entries(incoming)) {
    if (isPlaceholder(value)) continue;
    if (!isPlaceholder(result[key]) && !valuesEqual(result[key], value)) quality.conflicts.push(key);
    result[key] = value;
  }
  return result as T;
}

export function fieldCoverage(record: Record<string, unknown>, fields: string[]): number {
  if (!fields.length) return 1;
  return fields.filter((field) => !isPlaceholder(record[field])).length / fields.length;
}

export function auditRecord(record: object, requiredFields: string[]) {
  const values = record as Record<string, unknown>;
  const missing = requiredFields.filter((field) => isPlaceholder(values[field]));
  return {
    valid: !isPlaceholder(values.id) && !isPlaceholder(values.title) && missing.length === 0,
    missing,
    coverage: 1 - missing.length / Math.max(requiredFields.length, 1),
  };
}

export function isHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function dedupeResources(resources: ResourceRecord[]): ResourceRecord[] {
  const seen = new Set<string>();
  return resources.filter((resource) => {
    const workId = resource.workId ?? resource.animeId;
    const url = resource.originalUrl ?? resource.url;
    const key = `${workId}|${resource.resourceType ?? resource.kind}|${url}|${resource.episode ?? ''}|${resource.lineId ?? resource.line ?? ''}`;
    if (!workId || !isHttpUrl(url) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function auditResourceBindings(resources: ResourceRecord[]): string[] {
  const conflicts: string[] = [];
  const byUrl = new Map<string, Set<string>>();
  for (const resource of resources) {
    if (!resource.animeId) conflicts.push(`资源 ${resource.id} 缺少作品 ID`);
    if (!isHttpUrl(resource.url)) conflicts.push(`资源 ${resource.id} URL 无效`);
    const animeIds = byUrl.get(resource.url) ?? new Set<string>();
    animeIds.add(resource.animeId);
    byUrl.set(resource.url, animeIds);
  }
  for (const [url, animeIds] of byUrl) {
    if (animeIds.size > 1) conflicts.push(`同一资源地址绑定多个作品：${url}`);
  }
  return conflicts;
}
