import type { AgeCategoryKey, AgeDetail, AgeItem, AgePlayResult } from './dataRegistry';

const cache = new Map<string, Promise<Record<string, unknown> | undefined>>();

async function fetchStaticJson(path: string): Promise<Record<string, unknown> | undefined> {
  const existing = cache.get(path);
  if (existing) return existing;
  let request: Promise<Record<string, unknown> | undefined>;
  const evictFailedRequest = () => {
    if (cache.get(path) === request) cache.delete(path);
  };
  request = fetch(path, { cache: 'no-cache' })
    .then(async (response) => {
      if (!response.ok) {
        evictFailedRequest();
        return undefined;
      }
      try {
        return await response.json() as Record<string, unknown>;
      } catch {
        evictFailedRequest();
        return undefined;
      }
    })
    .catch(() => {
      evictFailedRequest();
      return undefined;
    });
  cache.set(path, request);
  return request;
}

export async function fetchAgeManifest() {
  return fetchStaticJson('/data/age/manifest.json');
}

export async function fetchStaticAgePage(category: AgeCategoryKey, page: number) {
  return fetchStaticJson(`/data/age/pages/${encodeURIComponent(category)}/${Math.max(1, Math.floor(page))}.json`);
}

export async function fetchStaticAgeItem(id: string): Promise<AgeItem | undefined> {
  const normalized = id.trim().toLowerCase();
  if (!/^[a-z0-9]+$/.test(normalized)) return undefined;
  const shard = await fetchStaticJson(`/data/age/items/${normalized.slice(0, 2) || '__'}.json`);
  const items = shard?.items;
  const item = items && typeof items === 'object' ? (items as Record<string, unknown>)[normalized] : undefined;
  return item && typeof item === 'object' ? item as AgeItem : undefined;
}

export async function fetchStaticAgeDetail(id: string): Promise<AgeDetail | undefined> {
  if (!/^[a-z0-9]+$/i.test(id)) return undefined;
  const detail = await fetchStaticJson(`/data/age/details/${encodeURIComponent(id)}.json`);
  if (!detail) return undefined;
  if (detail.episodeShard && !Array.isArray(detail.episodes)) {
    const episodes = await fetchStaticJson(`/data/age/episodes/${encodeURIComponent(id)}.json`);
    return { ...detail, episodes: Array.isArray(episodes?.episodes) ? episodes.episodes : [] } as unknown as AgeDetail;
  }
  return detail as unknown as AgeDetail;
}

export async function fetchStaticAgeSearch() {
  return fetchStaticJson('/data/age/search-index.json');
}

export async function fetchStaticAgePlay(sourceUrl: string): Promise<AgePlayResult | undefined> {
  let animeId = '';
  try { animeId = new URL(sourceUrl).pathname.match(/\/anime\/([^/]+)\/play\//)?.[1] ?? ''; } catch { return undefined; }
  if (!animeId) return undefined;
  const payload = await fetchStaticJson(`/data/age/play/${encodeURIComponent(animeId)}.json`);
  const plays = Array.isArray(payload?.plays) ? payload.plays as AgePlayResult[] : [];
  return plays.find((entry) => entry.sourcePage === sourceUrl);
}

export function clearAgeStaticCache() {
  cache.clear();
}
